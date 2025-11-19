/**
 * useCategories Hook
 * 카테고리 관련 React Query 훅
 */

import { useQuery } from '@tanstack/react-query';
import { getCategories, getCategoryById, getCategoryTree } from '../api/categoryApi';

/**
 * 카테고리 Query Key 상수
 */
export const CATEGORY_QUERY_KEYS = {
  ALL: ['categories'],
  LIST: (maxDepth) => ['categories', 'list', maxDepth],
  DETAIL: (categoryId) => ['categories', 'detail', categoryId],
  TREE: ['categories', 'tree']
};

/**
 * 대분류 카테고리 조회 훅
 * @param {number} maxDepth - 최대 깊이
 * @param {Object} options - React Query 옵션
 * @returns {Object} Query 결과
 */
export const useCategories = (maxDepth = 1, options = {}) => {
  return useQuery({
    queryKey: CATEGORY_QUERY_KEYS.LIST(maxDepth),
    queryFn: () => getCategories(maxDepth),
    staleTime: 1000 * 60 * 30, // 30분 (카테고리는 자주 변하지 않음)
    gcTime: 1000 * 60 * 60,    // 1시간
    retry: 2,
    ...options
  });
};

/**
 * 특정 카테고리의 하위 카테고리 조회 훅
 * @param {number} categoryId - 부모 카테고리 ID
 * @param {Object} options - React Query 옵션
 * @returns {Object} Query 결과
 */
export const useCategoryById = (categoryId, options = {}) => {
  return useQuery({
    queryKey: CATEGORY_QUERY_KEYS.DETAIL(categoryId),
    queryFn: () => getCategoryById(categoryId),
    enabled: !!categoryId, // categoryId가 있을 때만 실행
    staleTime: 1000 * 60 * 30, // 30분
    gcTime: 1000 * 60 * 60,    // 1시간
    retry: 2,
    ...options
  });
};

/**
 * 전체 카테고리 트리 조회 훅
 * @param {Object} options - React Query 옵션
 * @returns {Object} Query 결과
 */
export const useCategoryTree = (options = {}) => {
  return useQuery({
    queryKey: CATEGORY_QUERY_KEYS.TREE,
    queryFn: getCategoryTree,
    staleTime: 1000 * 60 * 30, // 30분
    gcTime: 1000 * 60 * 60,    // 1시간
    retry: 2,
    ...options
  });
};

