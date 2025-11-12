/**
 * useSearch Hook
 * 검색 관련 로직을 관리하는 훅
 */

import { isError, useQuery } from '@tanstack/react-query';
import { searchApi } from '../api/searchApi';
import { QUERY_KEYS } from '@/lib/react-query/queryKeys';

export const useSearch = (query, filters = {}, page) => {
  console.log('🔍 [useSearch] 훅 호출됨 - 파라미터:', { query, filters, page });
  
  // 통합 검색
  const {
    data: searchResults,
    isLoading,
    error,
    isError,
    refetch,
    dataUpdatedAt
  } = useQuery({
    queryKey: [QUERY_KEYS.SEARCH, query, filters, page],
    queryFn: () => {
      console.log('🚀 [useSearch] queryFn 실행 중...');
      return searchApi.search({ query, ...filters, page, size: 20 });
    },
    enabled: false,
    staleTime: 1000 * 60 * 2, // 2분
    retry: false // 디버깅을 위해 재시도 비활성화
  });

  const data = searchResults?.data?.data;

  console.log('📊 [useSearch] 상태:', {
    query,
    filters,
    page,
    isLoading,
    isError,
    error: error?.message,
    hasSearchResults: !!searchResults,
    searchResponsesCount: data?.searchResponses?.length || 0,
    totalElements: data?.totalElements || 0
  });

  return {
    searchResponses: data?.searchResponses || [],
    hashtags: data?.hashtags || [],
    total: data?.totalElements || 0,
    page: data?.page || 1,
    size: data?.size || 14,
    fetchCount: data?.fetchCount || 0,
    isLoading,
    error,
    isError,
    refetch
  };
};

export const useHashtags = (params = {}) => {
  const {
    data: hashtags,
    isLoading,
    error
  } = useQuery({
    queryKey: [QUERY_KEYS.SEARCH, 'hashtags', params],
    queryFn: () => searchApi.getHashtags(params),
    staleTime: 1000 * 60 * 10 // 10분
  });

  return {
    hashtags: hashtags?.data || [],
    isLoading,
    error
  };
};

export const useCategories = () => {
  const {
    data: categories,
    isLoading,
    error
  } = useQuery({
    queryKey: [QUERY_KEYS.SEARCH, 'categories'],
    queryFn: searchApi.getCategories,
    staleTime: 1000 * 60 * 30 // 30분
  });

  return {
    categories: categories?.data || [],
    isLoading,
    error
  };
};
