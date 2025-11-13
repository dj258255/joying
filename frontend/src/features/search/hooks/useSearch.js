/**
 * useSearch Hook
 * 검색 관련 로직을 관리하는 훅
 */

import { isError, useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { searchApi } from '../api/searchApi';
import { QUERY_KEYS } from '@/lib/react-query/queryKeys';

// 무한스크롤용 검색 훅 (현업 표준)
export const useInfiniteSearch = (query, filters = {}) => {
  console.log('🔍 [useInfiniteSearch] 훅 호출됨 - 파라미터:', { query, filters });

  const {
    data,
    isLoading,
    error,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch
  } = useInfiniteQuery({
    queryKey: [QUERY_KEYS.SEARCH, query, filters],
    queryFn: ({ pageParam = 1 }) => {
      console.log('🚀 [useInfiniteSearch] queryFn 실행 - page:', pageParam);
      return searchApi.search({ query, ...filters, page: pageParam, size: 20 });
    },
    getNextPageParam: (lastPage, allPages) => {
      const data = lastPage?.data?.data;
      const searchResponses = data?.searchResponses || [];
      const size = data?.size || 20;
      const currentPage = allPages.length; // 현재 로드된 페이지 수

      // 🔥 백엔드 버그 우회: totalElements가 잘못되어 있으므로,
      // 현재 페이지의 결과 개수가 size와 같으면 다음 페이지가 있다고 가정
      const hasMore = searchResponses.length === size;

      console.log('📄 [useInfiniteSearch] getNextPageParam:', {
        currentPage,
        receivedCount: searchResponses.length,
        size,
        hasMore,
        nextPage: hasMore ? currentPage + 1 : undefined
      });

      // 다음 페이지가 있으면 페이지 번호 반환, 없으면 undefined
      return hasMore ? currentPage + 1 : undefined;
    },
    enabled: true, // 자동 실행
    staleTime: 1000 * 60 * 2, // 2분
    retry: false
  });

  // 모든 페이지의 데이터를 하나의 배열로 병합
  const allProducts = data?.pages?.flatMap(page => {
    const pageData = page?.data?.data;
    return pageData?.searchResponses || [];
  }) || [];

  // 첫 페이지의 메타데이터
  const firstPageData = data?.pages?.[0]?.data?.data;

  console.log('📊 [useInfiniteSearch] 상태:', {
    query,
    filters,
    isLoading,
    isFetchingNextPage,
    isError,
    error: error?.message,
    totalProducts: allProducts.length,
    totalElements: firstPageData?.totalElements || 0,
    hasNextPage
  });

  return {
    products: allProducts,
    hashtags: firstPageData?.hashtags || [],
    total: firstPageData?.totalElements || 0,
    fetchCount: firstPageData?.fetchCount || 0,
    isLoading,
    isFetchingNextPage,
    error,
    isError,
    fetchNextPage,
    hasNextPage,
    refetch
  };
};

// 기존 호환성을 위한 레거시 훅 (deprecated)
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
