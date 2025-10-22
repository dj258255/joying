/**
 * useProducts Hook
 * 상품 목록 관련 로직을 관리하는 훅
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productApi } from '../api/productApi';
import { QUERY_KEYS } from '@/lib/react-query/queryKeys';

export const useProducts = (filters = {}) => {
  const queryClient = useQueryClient();

  // 상품 목록 조회
  const {
    data: products,
    isLoading,
    error
  } = useQuery({
    queryKey: [QUERY_KEYS.PRODUCTS, filters],
    queryFn: () => productApi.getProducts(filters),
    staleTime: 1000 * 60 * 5 // 5분
  });

  // 상품 생성
  const createProductMutation = useMutation({
    mutationFn: productApi.createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries([QUERY_KEYS.PRODUCTS]);
    }
  });

  // 상품 수정
  const updateProductMutation = useMutation({
    mutationFn: ({ productId, productData }) => 
      productApi.updateProduct(productId, productData),
    onSuccess: () => {
      queryClient.invalidateQueries([QUERY_KEYS.PRODUCTS]);
    }
  });

  // 상품 삭제
  const deleteProductMutation = useMutation({
    mutationFn: productApi.deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries([QUERY_KEYS.PRODUCTS]);
    }
  });

  return {
    products: products?.data || [],
    isLoading,
    error,
    createProduct: createProductMutation.mutateAsync,
    updateProduct: updateProductMutation.mutateAsync,
    deleteProduct: deleteProductMutation.mutateAsync,
    isCreating: createProductMutation.isPending,
    isUpdating: updateProductMutation.isPending,
    isDeleting: deleteProductMutation.isPending
  };
};
