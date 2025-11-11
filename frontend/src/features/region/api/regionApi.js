/**
 * Region API
 * 지역(시도 → 구군 → 동) 관련 API 호출 함수들
 */

import { axiosInstance } from '@/lib/axios/axiosInstance';
import { API_ENDPOINTS } from '@/shared/constants/apiEndpoints';

/**
 * 시·도 목록 조회
 * @returns {Promise<Array>} 시도 목록 [{ id, name }]
 */
export const getSidos = async () => {
  const response = await axiosInstance.get(API_ENDPOINTS.REGION.SIDO_LIST);
  // 응답 구조: { message: "...", data: [...] }
  return response.data || [];
};

/**
 * 특정 시도의 구·군 목록 조회
 * @param {number} sidoId - 시도 ID
 * @returns {Promise<Array>} 구군 목록 [{ id, name }]
 */
export const getGungus = async (sidoId) => {
  const response = await axiosInstance.get(API_ENDPOINTS.REGION.GUNGU_LIST(sidoId));
  // 응답 구조: { message: "...", data: [...] }
  return response.data || [];
};

/**
 * 특정 구·군의 동 목록 조회
 * @param {number} gunguId - 구군 ID
 * @returns {Promise<Array>} 동 목록 [{ id, name }]
 */
export const getDongs = async (gunguId) => {
  const response = await axiosInstance.get(API_ENDPOINTS.REGION.DONG_LIST(gunguId));
  // 응답 구조: { message: "...", data: [...] }
  return response.data || [];
};