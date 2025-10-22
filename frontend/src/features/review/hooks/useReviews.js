/**
 * useReviews Hook
 * 리뷰 관련 로직을 관리하는 훅
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewApi } from '../api/reviewApi';
import { QUERY_KEYS } from '@/lib/react-query/queryKeys';

export const useReviews = (filters = {}) => {
  const queryClient = useQueryClient();

  // 리뷰 목록 조회
  const {
    data: reviews,
    isLoading,
    error
  } = useQuery({
    queryKey: [QUERY_KEYS.REVIEWS, filters],
    queryFn: () => reviewApi.getReviews(filters),
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
