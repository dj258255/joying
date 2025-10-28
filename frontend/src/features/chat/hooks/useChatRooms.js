/**
 * useChatRooms Hook
 * 채팅방 목록 관련 로직을 관리하는 훅
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatApi } from '../api/chatApi';
import { QUERY_KEYS } from '@/lib/react-query/queryKeys';

export const useChatRooms = (params = {}) => {
  const queryClient = useQueryClient();

  // 채팅방 목록 조회
  const {
    data: chatRooms,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: [QUERY_KEYS.CHATS, 'rooms', params],
    queryFn: () => chatApi.getChatRooms(params),
    staleTime: 1000 * 60 * 2 // 2분
  });

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
    mutationFn: chatApi.togglePinChatRoom,
    onSuccess: () => {
      queryClient.invalidateQueries([QUERY_KEYS.CHATS, 'rooms']);
    }
  });

  // 채팅방 알림 설정
  const toggleMuteMutation = useMutation({
    mutationFn: chatApi.toggleMuteChatRoom,
    onSuccess: () => {
      queryClient.invalidateQueries([QUERY_KEYS.CHATS, 'rooms']);
    }
  });

  return {
    chatRooms: chatRooms || [],
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
