/**
 * useReviewWrite Hook
 * 리뷰 작성 관련 로직을 관리하는 훅
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewApi } from '../api/reviewApi';
import { productReviewApi } from '../api/productReviewApi';
import { userReviewApi } from '../api/userReviewApi';
import { QUERY_KEYS } from '@/lib/react-query/queryKeys';

export const useReviewWrite = (type = 'general') => {
  const queryClient = useQueryClient();

  // 일반 리뷰 작성
  const createReviewMutation = useMutation({
    mutationFn: reviewApi.createReview,
    onSuccess: () => {
      queryClient.invalidateQueries([QUERY_KEYS.REVIEWS]);
    }
  });

  // 상품 리뷰 작성
  const createProductReviewMutation = useMutation({
    mutationFn: ({ productId, reviewData }) => 
      productReviewApi.createProductReview(productId, reviewData),
    onSuccess: () => {
      queryClient.invalidateQueries([QUERY_KEYS.REVIEWS]);
      queryClient.invalidateQueries([QUERY_KEYS.PRODUCTS]);
    }
  });

  // 사용자 리뷰 작성
  const createUserReviewMutation = useMutation({
    mutationFn: ({ userId, reviewData }) => 
      userReviewApi.createUserReview(userId, reviewData),
    onSuccess: () => {
      queryClient.invalidateQueries([QUERY_KEYS.REVIEWS]);
      queryClient.invalidateQueries([QUERY_KEYS.USER]);
    }
  });

  // 리뷰 수정
  const updateReviewMutation = useMutation({
    mutationFn: ({ reviewId, reviewData }) => 
      reviewApi.updateReview(reviewId, reviewData),
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

  const getMutationByType = () => {
    switch (type) {
      case 'product':
        return createProductReviewMutation;
      case 'user':
        return createUserReviewMutation;
      default:
        return createReviewMutation;
    }
  };

  const mutation = getMutationByType();

  return {
    createReview: mutation.mutateAsync,
    updateReview: updateReviewMutation.mutateAsync,
    deleteReview: deleteReviewMutation.mutateAsync,
    isCreating: mutation.isPending,
    isUpdating: updateReviewMutation.isPending,
    isDeleting: deleteReviewMutation.isPending,
    createError: mutation.error,
    updateError: updateReviewMutation.error,
    deleteError: deleteReviewMutation.error
  };
};
