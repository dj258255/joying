/**
 * useInfiniteScroll Hook
 * 무한 스크롤을 위한 커스텀 훅
 */

import { useEffect, useCallback, useRef } from 'react';

/**
 * @param {Function} fetchMore - 추가 데이터 로드 함수
 * @param {boolean} hasMore - 더 불러올 데이터가 있는지 여부
 * @param {boolean} isLoading - 로딩 상태
 * @param {number} threshold - 트리거 임계값 (픽셀)
 */
export const useInfiniteScroll = (fetchMore, hasMore, isLoading, threshold = 100) => {
  const observerRef = useRef();

  const lastElementRef = useCallback((node) => {
    if (isLoading) return;
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        fetchMore();
      }
    }, {
      rootMargin: `${threshold}px`
    });
    
    if (node) observerRef.current.observe(node);
  }, [fetchMore, hasMore, isLoading, threshold]);

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return lastElementRef;
};
