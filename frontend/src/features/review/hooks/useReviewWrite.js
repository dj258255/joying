/**
 * useReviewWrite Hook
 * 리뷰 작성 관련 로직을 관리하는 훅
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewApi } from '../api/reviewApi';
import { productReviewApi } from '../api/productReviewApi';
import { userReviewApi } from '../api/userReviewApi';
import { QUERY_KEYS } from '@/lib/react-query/queryKeys';

export const useReviewWrite = (type = 'general', targetId = null) => {
  const queryClient = useQueryClient();

  // 리뷰 작성
  const createReviewMutation = useMutation({
    mutationFn: async (reviewData) => {
      const res = await reviewApi.createReview(reviewData);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries([QUERY_KEYS.REVIEWS]);
    },
  });

  // 리뷰 수정
  const updateReviewMutation = useMutation({
    mutationFn: (reviewData) => 
      reviewApi.updateReview(reviewData),
    onSuccess: () => {
      queryClient.invalidateQueries([QUERY_KEYS.REVIEWS]);
    }
  });

  // 리뷰 삭제
  const deleteReviewMutation = useMutation({
    mutationFn: reviewApi.deleteReview,
    onSuccess: () => {
      queryClient.invalidateQueries([QUERY_KEYS.REVIEWS]);
    }
  });

  const getReviewDetail = async (reviewId) => {
    const res = await reviewApi.getReviewDetail(reviewId);
    return res?.data;
  };

  return {
    createReview: createReviewMutation.mutateAsync,
    updateReview: updateReviewMutation.mutateAsync,
    deleteReview: deleteReviewMutation.mutateAsync,
    getReviewDetail,
    isCreating: createReviewMutation.isPending,
    isUpdating: updateReviewMutation.isPending,
    isDeleting: deleteReviewMutation.isPending,
    createError: createReviewMutation.error,
    updateError: updateReviewMutation.error,
    deleteError: deleteReviewMutation.error
  };
};
