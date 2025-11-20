/**
 * useProductLike Hook
 * 상품 찜하기 관련 로직을 관리하는 훅
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { productApi } from '../api/productApi';
import { QUERY_KEYS } from '@/lib/react-query/queryKeys';

/**
 * 상품 찜하기 훅
 * @param {string} productId - 상품 ID
 * @returns {Object} { toggleLike, isLoading }
 */
export const useProductLike = (productId) => {
  const queryClient = useQueryClient();

  // 찜하기/찜하기 취소
  const toggleLikeMutation = useMutation({
    mutationFn: async (isLiked) => {
      console.log('[useProductLike] 찜하기 토글:', { productId, isLiked });
      const result = isLiked 
        ? await productApi.unlikeProduct(productId) 
        : await productApi.likeProduct(productId);
      console.log('[useProductLike] API 응답:', result);
      return result;
    },
    onSuccess: (data, variables) => {
      console.log('[useProductLike] 찜하기 성공:', data);
      const newLikedState = !variables; // variables는 이전 상태(isLiked), 반대가 새 상태
      
      // 상품 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PRODUCTS] });
      
      // 검색 결과 캐시 직접 업데이트 (ProductListMain에서 사용)
      queryClient.setQueryData([QUERY_KEYS.SEARCH], (oldData) => {
        if (!oldData) return oldData;
        
        // 응답 구조에 따라 데이터 추출
        const responseData = oldData?.data?.data || oldData?.data || oldData;
        const searchResponses = responseData?.searchResponses || [];
        
        // 특정 상품의 liked 상태 업데이트
        const updatedSearchResponses = searchResponses.map((product) => {
          const pid = product.productId || product.id;
          if (String(pid) === String(productId)) {
            console.log('[useProductLike] SEARCH 쿼리 캐시 업데이트:', {
              productId: pid,
              oldLiked: product.liked || product.isLiked,
              newLiked: newLikedState
            });
            return {
              ...product,
              liked: newLikedState,
              isLiked: newLikedState
            };
          }
          return product;
        });
        
        // 응답 구조 유지하면서 업데이트
        if (oldData?.data?.data) {
          return {
            ...oldData,
            data: {
              ...oldData.data,
              data: {
                ...oldData.data.data,
                searchResponses: updatedSearchResponses
              }
            }
          };
        } else if (oldData?.data) {
          return {
            ...oldData,
            data: {
              ...oldData.data,
              searchResponses: updatedSearchResponses
            }
          };
        } else {
          return {
            ...oldData,
            searchResponses: updatedSearchResponses
          };
        }
      });
      
      // 검색 결과 캐시 무효화 (서버에서 최신 데이터 가져오기)
      // 새로고침 시 서버에서 liked 필드를 포함한 최신 데이터를 가져오도록 함
      queryClient.invalidateQueries({ 
        queryKey: [QUERY_KEYS.SEARCH],
        refetchType: 'active' // 활성 쿼리만 refetch
      });
      
      // 상품 상세 캐시 업데이트 (optimistic update)
      queryClient.setQueryData([QUERY_KEYS.PRODUCT_DETAIL, productId], (oldData) => {
        if (oldData) {
          return {
            ...oldData,
            liked: newLikedState
          };
        }
        return oldData;
      });
      // 상품 상세 캐시 무효화 (서버에서 최신 데이터 가져오기)
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PRODUCT_DETAIL, productId] });
      // 찜한 상품 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MYPAGE, QUERY_KEYS.LIKED_PRODUCTS] });
    },
    onError: (error) => {
      console.error('[useProductLike] 찜하기 처리 실패:', error);
      console.error('[useProductLike] 에러 상세:', {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status
      });
    }
  });

  /**
   * 찜하기 토글
   * @param {boolean} isLiked - 현재 찜하기 상태
   * @returns {Promise} Mutation promise
   */
  const toggleLike = (isLiked) => {
    if (!productId) {
      console.warn('[useProductLike] productId가 없습니다.');
      return Promise.reject(new Error('productId가 없습니다.'));
    }
    return toggleLikeMutation.mutateAsync(isLiked);
  };

  return {
    toggleLike,
    isLoading: toggleLikeMutation.isPending
  };
};
