/**
 * useMessages Hook
 * 메시지 관련 로직을 관리하는 훅
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { messageApi } from '../api/messageApi';
import { QUERY_KEYS } from '@/lib/react-query/queryKeys';

export const useMessages = (chatRoomId) => {
  const queryClient = useQueryClient();

  // 메시지 목록 조회
  const {
    data: messages,
    isLoading,
    error
  } = useQuery({
    queryKey: [QUERY_KEYS.CHATS, 'messages', chatRoomId],
    queryFn: () => messageApi.getMessages(chatRoomId),
    enabled: !!chatRoomId,
    staleTime: 1000 * 30 // 30초
  });

  // 메시지 전송
  const sendMessageMutation = useMutation({
    mutationFn: (messageData) => messageApi.sendMessage(chatRoomId, messageData),
    onSuccess: () => {
      queryClient.invalidateQueries([QUERY_KEYS.CHATS, 'messages', chatRoomId]);
      queryClient.invalidateQueries([QUERY_KEYS.CHATS, 'rooms']);
    }
  });

  // 메시지 읽음 처리
  const markAsReadMutation = useMutation({
    mutationFn: (messageId) => messageApi.markAsRead(chatRoomId, messageId),
    onSuccess: () => {
      queryClient.invalidateQueries([QUERY_KEYS.CHATS, 'messages', chatRoomId]);
    }
  });

  // 모든 메시지 읽음 처리
  const markAllAsReadMutation = useMutation({
    mutationFn: () => messageApi.markAllAsRead(chatRoomId),
    onSuccess: () => {
      queryClient.invalidateQueries([QUERY_KEYS.CHATS, 'messages', chatRoomId]);
      queryClient.invalidateQueries([QUERY_KEYS.CHATS, 'rooms']);
    }
  });

  return {
    messages: messages || [],
    isLoading,
    error,
    sendMessage: sendMessageMutation.mutateAsync,
    markAsRead: markAsReadMutation.mutateAsync,
    markAllAsRead: markAllAsReadMutation.mutateAsync,
    isSending: sendMessageMutation.isPending,
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending
  };
};
