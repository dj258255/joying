/**
 * useChatRooms Hook
 * 채팅방 목록 관련 로직을 관리하는 훅
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatApi } from '../api/chatApi';
import { QUERY_KEYS } from '@/lib/react-query/queryKeys';

export const useChatRooms = () => {
  const queryClient = useQueryClient();

  // 채팅방 목록 조회
  const {
    data: chatRoomsData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: [QUERY_KEYS.CHATS, 'rooms'],
    queryFn: async () => {
      const result = await chatApi.getChatRooms();
      return result;
    },
    staleTime: 1000 * 60, // 1분
    refetchInterval: false,
    refetchIntervalInBackground: false
  });

  // 응답 데이터에서 chatRooms와 totalUnreadCount 추출
  // 백엔드에서 이미 isLeft=true인 채팅방을 제외하고 반환하므로
  // 프론트엔드에서는 추가 필터링 불필요
  const chatRoomsRaw = (chatRoomsData?.chatRooms || []).filter(room => room != null);

  // 중복 제거 (chatRoomId 기준)
  const chatRoomsMap = new Map();
  chatRoomsRaw.forEach((room) => {
    const roomId = room.chatRoomId || room.id;
    if (roomId) {
      const existingRoom = chatRoomsMap.get(roomId);
      if (!existingRoom) {
        chatRoomsMap.set(roomId, room);
      } else {
        // 최신 활동 시간 비교하여 최신 것만 유지
        const existingTime = new Date(existingRoom.lastMessageAt || existingRoom.updatedAt || 0).getTime();
        const currentTime = new Date(room.lastMessageAt || room.updatedAt || 0).getTime();
        if (currentTime > existingTime) {
          chatRoomsMap.set(roomId, room);
        }
      }
    }
  });

  const uniqueChatRooms = Array.from(chatRoomsMap.values());

  const chatRooms = uniqueChatRooms.slice().sort((a, b) => {
    // 고정 채팅방 우선
    const aPinned = !!a.isPinned;
    const bPinned = !!b.isPinned;
    if (aPinned !== bPinned) return aPinned ? -1 : 1;
    // 최신 활동 순 (lastMessageAt 내림차순)
    const aTime = new Date(a.lastMessageAt || a.updatedAt || 0).getTime();
    const bTime = new Date(b.lastMessageAt || b.updatedAt || 0).getTime();
    return bTime - aTime;
  });
  const totalUnreadCount = chatRoomsData?.totalUnreadCount || 0;

  // 채팅방 생성
  const createChatRoomMutation = useMutation({
    mutationFn: chatApi.createChatRoom,
    onSuccess: () => {
      queryClient.invalidateQueries([QUERY_KEYS.CHATS, 'rooms']);
    }
  });

  // 채팅방 나가기
  const leaveChatRoomMutation = useMutation({
    mutationFn: chatApi.leaveChatRoom,
    onMutate: async (chatRoomId) => {
      // 진행 중인 쿼리 취소 (낙관적 업데이트를 위해)
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.CHATS, 'rooms'] });

      // 이전 데이터 백업 (롤백용)
      const previousData = queryClient.getQueryData([QUERY_KEYS.CHATS, 'rooms']);

      // 낙관적 업데이트: 채팅방 목록에서 즉시 제거
      queryClient.setQueryData([QUERY_KEYS.CHATS, 'rooms'], (oldData) => {
        if (!oldData || !oldData.chatRooms) return oldData;

        const roomId = Number(chatRoomId);
        
        // 해당 채팅방을 제외한 목록 생성
        const filteredChatRooms = oldData.chatRooms.filter((room) => {
          const id = room.chatRoomId || room.id;
          return id && Number(id) !== roomId;
        });

        // totalUnreadCount 재계산
        const totalUnreadCount = filteredChatRooms.reduce(
          (sum, room) => sum + (room.unreadCount || 0),
          0
        );

        return {
          ...oldData,
          chatRooms: filteredChatRooms,
          totalUnreadCount
        };
      });

      // 롤백을 위한 컨텍스트 반환
      return { previousData };
    },
    onError: (error, chatRoomId, context) => {
      // 에러 발생 시 이전 데이터로 롤백
      if (context?.previousData) {
        queryClient.setQueryData([QUERY_KEYS.CHATS, 'rooms'], context.previousData);
      }
      console.error('채팅방 나가기 실패:', error);
    },
    onSuccess: () => {
      // 성공 시 서버 데이터와 동기화 (안전장치)
      queryClient.invalidateQueries([QUERY_KEYS.CHATS, 'rooms']);
    },
    onSettled: () => {
      // 완료 후 최종 동기화 (선택사항)
      // queryClient.invalidateQueries([QUERY_KEYS.CHATS, 'rooms']);
    }
  });

  // 채팅방 고정/해제
  const togglePinMutation = useMutation({
    mutationFn: ({ chatRoomId, isPinned }) => chatApi.togglePinChatRoom(chatRoomId, isPinned),
    onSuccess: () => {
      queryClient.invalidateQueries([QUERY_KEYS.CHATS, 'rooms']);
    }
  });

  // 채팅방 알림 설정
  const toggleMuteMutation = useMutation({
    mutationFn: ({ chatRoomId, isMuted }) => chatApi.toggleMuteChatRoom(chatRoomId, isMuted),
    onSuccess: () => {
      queryClient.invalidateQueries([QUERY_KEYS.CHATS, 'rooms']);
    }
  });

  return {
    chatRooms: chatRooms || [],
    totalUnreadCount,
    isLoading,
    error,
    refetch,
    createChatRoom: createChatRoomMutation.mutateAsync,
    leaveChatRoom: leaveChatRoomMutation.mutateAsync,
    togglePin: togglePinMutation.mutateAsync,
    toggleMute: toggleMuteMutation.mutateAsync,
    isCreating: createChatRoomMutation.isPending,
    isLeaving: leaveChatRoomMutation.isPending,
    isTogglingPin: togglePinMutation.isPending,
    isTogglingMute: toggleMuteMutation.isPending
  };
};
