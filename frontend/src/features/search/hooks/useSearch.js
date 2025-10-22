/**
 * useSearch Hook
 * 검색 관련 로직을 관리하는 훅
 */

import { useQuery } from '@tanstack/react-query';
import { searchApi } from '../api/searchApi';
import { QUERY_KEYS } from '@/lib/react-query/queryKeys';

export const useSearch = (query, filters = {}) => {
  // 통합 검색
  const {
    data: searchResults,
    isLoading,
    error
  } = useQuery({
    queryKey: [QUERY_KEYS.SEARCH, query, filters],
    queryFn: () => searchApi.search({ query, ...filters }),
    enabled: !!query,
    staleTime: 1000 * 60 * 2 // 2분
  });

  return {
    searchResults: searchResults?.data || [],
    isLoading,
    error
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
