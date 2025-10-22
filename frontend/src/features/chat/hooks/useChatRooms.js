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
    error
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

  // 채팅방 삭제
  const deleteChatRoomMutation = useMutation({
    mutationFn: chatApi.deleteChatRoom,
    onSuccess: () => {
      queryClient.invalidateQueries([QUERY_KEYS.CHATS, 'rooms']);
    }
  });

  return {
    chatRooms: chatRooms?.data || [],
    isLoading,
    error,
    createChatRoom: createChatRoomMutation.mutateAsync,
    deleteChatRoom: deleteChatRoomMutation.mutateAsync,
    isCreating: createChatRoomMutation.isPending,
    isDeleting: deleteChatRoomMutation.isPending
  };
};
