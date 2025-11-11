/**
 * useProductDetail Hook
 * 상품 상세 데이터 조회 (React Query)
 */

import { useQuery } from '@tanstack/react-query';
import { getProductDetail } from '../api/productDetailApi';
import { QUERY_KEYS } from '@/lib/react-query/queryKeys';

/**
 * @param {number|string} productId
 */
export const useProductDetail = (productId) => {
  const query = useQuery({
    queryKey: [QUERY_KEYS.PRODUCT_DETAIL, productId],
    queryFn: async () => {
      const res = await getProductDetail(productId);
      // 서버 응답 구조: { status, message, data, timestamp }
      // 또는 res.body.data 구조일 수 있음
      if (res?.body?.data) {
        return res.body.data;
      }
      return res?.data ?? res;
    },
    enabled: !!productId,
    staleTime: 60 * 1000,
  });

  return {
    product: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
};


