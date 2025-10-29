/**
 * Product Hooks
 * React Query를 사용한 상품 데이터 관리 훅
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProducts, getProductById, createProduct, updateProduct, deleteProduct } from '../api/productApi';

// Query Keys
export const PRODUCT_QUERY_KEYS = {
  PRODUCTS: 'products',
  PRODUCT_DETAIL: 'productDetail',
  LEND_PRODUCTS: 'lendProducts',
  BORROW_PRODUCTS: 'borrowProducts'
};

/**
 * 상품 목록 조회 훅
 * @param {Object} filters - 필터 옵션
 * @param {string} filters.type - 상품 타입 ('lend' | 'borrow')
 * @returns {Object} Query 결과
 */
export const useProducts = (filters = {}) => {
  return useQuery({
    queryKey: [PRODUCT_QUERY_KEYS.PRODUCTS, filters],
    queryFn: () => getProducts(filters),
    staleTime: 1000 * 60 * 5, // 5분
    gcTime: 1000 * 60 * 10,   // 10분 (cacheTime -> gcTime in v5)
    retry: 1,
    enabled: true // 항상 활성화
  });
};

/**
 * 빌려줘 상품 목록 조회 훅
 * @param {Object} filters - 필터 옵션
 * @returns {Object} Query 결과
 */
export const useLendProducts = (filters = {}) => {
  return useProducts({ ...filters, type: 'lend' });
};

/**
 * 구해요 상품 목록 조회 훅
 * @param {Object} filters - 필터 옵션
 * @returns {Object} Query 결과
 */
export const useBorrowProducts = (filters = {}) => {
  return useProducts({ ...filters, type: 'borrow' });
};

/**
 * 상품 상세 조회 훅
 * @param {string} productId - 상품 ID
 * @returns {Object} Query 결과
 */
export const useProduct = (productId) => {
  return useQuery({
    queryKey: [PRODUCT_QUERY_KEYS.PRODUCT_DETAIL, productId],
    queryFn: () => getProductById(productId),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    enabled: !!productId // productId가 있을 때만 활성화
  });
};

/**
 * 상품 생성 Mutation 훅
 * @returns {Object} Mutation 결과
 */
export const useCreateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      // 상품 목록 캐시 무효화
      queryClient.invalidateQueries({ 
        queryKey: [PRODUCT_QUERY_KEYS.PRODUCTS] 
      });
    },
    onError: (error) => {
      console.error('상품 등록 실패:', error);
    }
  });
};

/**
 * 상품 수정 Mutation 훅
 * @returns {Object} Mutation 결과
 */
export const useUpdateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => updateProduct(id, data),
    onSuccess: (data, variables) => {
      // 상품 목록 캐시 무효화
      queryClient.invalidateQueries({ 
        queryKey: [PRODUCT_QUERY_KEYS.PRODUCTS] 
      });
      // 상품 상세 캐시 무효화
      queryClient.invalidateQueries({ 
        queryKey: [PRODUCT_QUERY_KEYS.PRODUCT_DETAIL, variables.id] 
      });
    },
    onError: (error) => {
      console.error('상품 수정 실패:', error);
    }
  });
};

/**
 * 상품 삭제 Mutation 훅
 * @returns {Object} Mutation 결과
 */
export const useDeleteProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProduct,
    onSuccess: (data, productId) => {
      // 상품 목록 캐시 무효화
      queryClient.invalidateQueries({ 
        queryKey: [PRODUCT_QUERY_KEYS.PRODUCTS] 
      });
      // 상품 상세 캐시 제거
      queryClient.removeQueries({ 
        queryKey: [PRODUCT_QUERY_KEYS.PRODUCT_DETAIL, productId] 
      });
    },
    onError: (error) => {
      console.error('상품 삭제 실패:', error);
    }
  });
};
