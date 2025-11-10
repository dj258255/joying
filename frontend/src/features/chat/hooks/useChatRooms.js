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
  const chatRoomsRaw = (chatRoomsData?.chatRooms || []);
  const chatRoomsFiltered = chatRoomsRaw.filter(room => {
    if (!room) return false;
    const status = room.status || room.chatRoomStatus;
    if (!status) return true;
    return status.toUpperCase() !== 'CLOSED';
  });

  const chatRooms = chatRoomsFiltered.slice().sort((a, b) => {
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
    onSuccess: () => {
      queryClient.invalidateQueries([QUERY_KEYS.CHATS, 'rooms']);
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
