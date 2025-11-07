/**
 * useSearch Hook
 * 검색 관련 로직을 관리하는 훅
 */

import { isError, useQuery } from '@tanstack/react-query';
import { searchApi } from '../api/searchApi';
import { QUERY_KEYS } from '@/lib/react-query/queryKeys';

export const useSearch = (query, filters = {}) => {
  // 통합 검색
  const {
    data: searchResults,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: [QUERY_KEYS.SEARCH],
    queryFn: () => searchApi.search({ query, ...filters }),
    enabled: false,
    staleTime: 1000 * 60 * 2 // 2분
  });

  const data = searchResults?.data?.data;

  return {
    searchResponses: data?.searchResponses || [],
    hashtags: data?.hashtags || [],
    total: data?.totalElements || 0,
    page: data?.page || 1,
    size: data?.size || 14,
    isLoading,
    error,
    isError: false,
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
