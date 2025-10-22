/**
 * useMessages Hook
 * 메시지 관련 로직을 관리하는 훅
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { messageApi } from '../api/messageApi';
import { QUERY_KEYS } from '@/lib/react-query/queryKeys';

export const useMessages = (chatRoomId, params = {}) => {
  const queryClient = useQueryClient();

  // 메시지 목록 조회
  const {
    data: messages,
    isLoading,
    error
  } = useQuery({
    queryKey: [QUERY_KEYS.CHATS, 'messages', chatRoomId, params],
    queryFn: () => messageApi.getMessages(chatRoomId, params),
    enabled: !!chatRoomId,
    staleTime: 1000 * 30 // 30초
  });

  // 메시지 전송
  const sendMessageMutation = useMutation({
    mutationFn: (messageData) => messageApi.sendMessage(chatRoomId, messageData),
    onSuccess: () => {
      queryClient.invalidateQueries([QUERY_KEYS.CHATS, 'messages', chatRoomId]);
    }
  });

  // 메시지 수정
  const updateMessageMutation = useMutation({
    mutationFn: ({ messageId, messageData }) => 
      messageApi.updateMessage(messageId, messageData),
    onSuccess: () => {
      queryClient.invalidateQueries([QUERY_KEYS.CHATS, 'messages', chatRoomId]);
    }
  });

  // 메시지 삭제
  const deleteMessageMutation = useMutation({
    mutationFn: messageApi.deleteMessage,
    onSuccess: () => {
      queryClient.invalidateQueries([QUERY_KEYS.CHATS, 'messages', chatRoomId]);
    }
  });

  return {
    messages: messages?.data || [],
    isLoading,
    error,
    sendMessage: sendMessageMutation.mutateAsync,
    updateMessage: updateMessageMutation.mutateAsync,
    deleteMessage: deleteMessageMutation.mutateAsync,
    isSending: sendMessageMutation.isPending,
    isUpdating: updateMessageMutation.isPending,
    isDeleting: deleteMessageMutation.isPending
  };
};
