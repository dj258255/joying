/**
 * useRentalRequest Hook
 * 대여 요청 관련 로직을 관리하는 훅
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { messageApi } from '../api/messageApi';
import { QUERY_KEYS } from '@/lib/react-query/queryKeys';

export const useRentalRequest = () => {
  const queryClient = useQueryClient();

  // 대여 요청 전송
  const sendRentalRequestMutation = useMutation({
    mutationFn: ({ chatRoomId, productId, rentalData }) => 
      messageApi.sendMessage(chatRoomId, {
        type: 'rental_request',
        productId,
        ...rentalData
      }),
    onSuccess: () => {
      queryClient.invalidateQueries([QUERY_KEYS.CHATS]);
    }
  });

  // 대여 요청 승인
  const approveRentalRequestMutation = useMutation({
    mutationFn: ({ messageId, approvalData }) => 
      messageApi.updateMessage(messageId, {
        type: 'rental_approval',
        ...approvalData
      }),
    onSuccess: () => {
      queryClient.invalidateQueries([QUERY_KEYS.CHATS]);
    }
  });

  // 대여 요청 거절
  const rejectRentalRequestMutation = useMutation({
    mutationFn: ({ messageId, rejectionData }) => 
      messageApi.updateMessage(messageId, {
        type: 'rental_rejection',
        ...rejectionData
      }),
    onSuccess: () => {
      queryClient.invalidateQueries([QUERY_KEYS.CHATS]);
    }
  });

  return {
    sendRentalRequest: sendRentalRequestMutation.mutateAsync,
    approveRentalRequest: approveRentalRequestMutation.mutateAsync,
    rejectRentalRequest: rejectRentalRequestMutation.mutateAsync,
    isSendingRequest: sendRentalRequestMutation.isPending,
    isApproving: approveRentalRequestMutation.isPending,
    isRejecting: rejectRentalRequestMutation.isPending
  };
};
