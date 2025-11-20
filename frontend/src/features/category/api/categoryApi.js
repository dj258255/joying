/**
 * Category API
 * 카테고리 관련 API 호출 함수들
 */

import { axiosInstance } from '@/lib/axios/axiosInstance';
import { API_ENDPOINTS } from '@/shared/constants/apiEndpoints';

/**
 * 대분류 카테고리 조회
 * @param {number} maxDepth - 최대 깊이 (1: 대분류만, 2: 대분류+중분류, 3: 전체)
 * @returns {Promise<Array>} 카테고리 목록
 */
export const getCategories = async (maxDepth = 1) => {
  const response = await axiosInstance.get(API_ENDPOINTS.CATEGORY.LIST, {
    params: { maxDepth }
  });
  // 응답 구조: { message: "...", data: [...] }
  return response.data.data || [];
};

/**
 * 특정 카테고리의 하위 카테고리 조회
 * @param {number} categoryId - 부모 카테고리 ID
 * @returns {Promise<Array>} 하위 카테고리 배열
 */
export const getCategoryById = async (categoryId) => {
  const response = await axiosInstance.get(
    API_ENDPOINTS.CATEGORY.DETAIL(categoryId)
  );
  // 응답 구조: { message: "하위 카테고리 조회 성공", data: [...] }
  return response.data.data || [];
};

/**
 * 카테고리 트리 전체 조회 (대분류 + 하위 카테고리)
 * @returns {Promise<Array>} 전체 카테고리 트리
 */
export const getCategoryTree = async () => {
  const response = await axiosInstance.get(API_ENDPOINTS.CATEGORY.LIST);
  return response.data.data || [];
};

