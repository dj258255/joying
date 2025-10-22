/**
 * Search API functions
 * 통합 검색, 해시태그/카테고리 조회 API
 */

import { axiosInstance } from '@/lib/axios/axiosInstance';

export const searchApi = {
  /**
   * 통합 검색
   * @param {Object} params - 검색 파라미터
   * @returns {Promise} 검색 결과
   */
  search: (params) => 
    axiosInstance.get('/search', { params }),

  /**
   * 해시태그 조회
   * @param {Object} params - 쿼리 파라미터
   * @returns {Promise} 해시태그 목록
   */
  getHashtags: (params) => 
    axiosInstance.get('/search/hashtags', { params }),

  /**
   * 카테고리 조회
   * @returns {Promise} 카테고리 목록
   */
  getCategories: () => 
    axiosInstance.get('/search/categories')
};
