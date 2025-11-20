/**
 * useReviews Hook
 * 리뷰 관련 로직을 관리하는 훅
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewApi } from '../api/reviewApi';
import { productReviewApi } from '../api/productReviewApi';
import { userReviewApi } from '../api/userReviewApi';
import { QUERY_KEYS } from '@/lib/react-query/queryKeys';

export const useReviews = (type, targetId, filters = {}) => {
  const queryClient = useQueryClient();

  // 리뷰 목록 조회
  const {
    data: reviews,
    isLoading,
    error
  } = useQuery({
    queryKey: [QUERY_KEYS.REVIEWS, type, targetId],
    queryFn: async () => {
      if (type === 'product') {
        const data = await productReviewApi.getProductReviews(targetId, filters);
        console.log(data.data);
        return data.data;
      } else if (type === 'member') {
        const data = await userReviewApi.getUserReviews(targetId, filters);
        return data.data;
      } else {
        throw new Error('Invalid review type');
      }
    },
    staleTime: 1000 * 60 * 5 // 5분
  });

  // 리뷰 생성
  const createReviewMutation = useMutation({
    mutationFn: reviewApi.createReview,
    onSuccess: () => {
      queryClient.invalidateQueries([QUERY_KEYS.REVIEWS]);
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

  return {
    reviews: reviews?.data || [],
    isLoading,
    error,
    createReview: createReviewMutation.mutateAsync,
    updateReview: updateReviewMutation.mutateAsync,
    deleteReview: deleteReviewMutation.mutateAsync,
    isCreating: createReviewMutation.isPending,
    isUpdating: updateReviewMutation.isPending,
    isDeleting: deleteReviewMutation.isPending
  };
};
