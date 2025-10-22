/**
 * useProductLike Hook
 * 상품 찜하기 관련 로직을 관리하는 훅
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { productApi } from '../api/productApi';
import { QUERY_KEYS } from '@/lib/react-query/queryKeys';

export const useProductLike = (productId) => {
  const queryClient = useQueryClient();

  // 찜하기/찜하기 취소
  const toggleLikeMutation = useMutation({
    mutationFn: (isLiked) => 
      isLiked ? productApi.unlikeProduct(productId) : productApi.likeProduct(productId),
    onSuccess: () => {
      queryClient.invalidateQueries([QUERY_KEYS.PRODUCTS]);
      queryClient.invalidateQueries([QUERY_KEYS.MYPAGE, 'liked-products']);
    }
  });

  const toggleLike = (isLiked) => {
    toggleLikeMutation.mutate(isLiked);
  };

  return {
    toggleLike,
    isLoading: toggleLikeMutation.isPending
  };
};
