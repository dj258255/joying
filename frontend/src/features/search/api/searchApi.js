/**
 * Search API functions
 * 통합 검색, 해시태그/카테고리 조회 API
 */

import { axiosInstance } from '@/lib/axios/axiosInstance';

/**
 * 검색 API
 */
export const searchApi = {
  /**
   * 통합 검색
   * @param {Object} params
   * @param {string} [params.q] - 검색어
   * @param {number} [params.price_min] - 최소 가격
   * @param {number} [params.price_max] - 최대 가격
   * @param {string} [params.region] - 지역
   * @param {string} [params.date_from] - 시작일 (ISO8601)
   * @param {string} [params.date_to] - 종료일 (ISO8601)
   * @param {number} [params.rating] - 최소 평점
   * @param {string} [params.method] - 거래 방법
   * @param {number[]} [params.category] - 카테고리 ID 목록
   * @param {string[]} [params.hashtag] - 해시태그 목록
   * @param {number} [params.page=1]
   * @param {number} [params.size=20]
   * @returns {Promise<{items: Array, total: number}>}
   */
  search: async (params) => {
    return await axiosInstance.get('/search', { params });
  },

  /**
   * 자동완성 검색
   * @param {string} q - 검색어
   * @param {number} [limit=5] - 가져올 추천 개수
   * @returns {Promise<string[]>} 자동완성 추천어 리스트
   */
  autocomplete: async (q) => {
    if (!q?.trim()) return [];
    const res = await axiosInstance.get('/search/autocomplete', {
      params: { q },
    });
    return res.data;
  },
};

// Hashtag API
export const hashtagApi = {
  /**
   * 해시태그 목록 조회
   * @returns {Promise<Array>}
   */
  getHashtags: async () => {
    return await axiosInstance.get('/hashtag');
  },

  /**
   * 해시태그 생성
   * @param {Object} data
   * @param {string} data.name - 해시태그명
   * @returns {Promise<Object>}
   */
  createHashtag: async (data) => {
    return await axiosInstance.post('/hashtag', data);
  }
};

// Category API
export const categoryApi = {
  /**
   * 상위 카테고리 조회
   * @returns {Promise<Array>}
   */
  getCategories: async () => {
    return await axiosInstance.get('/category');
  },

  /**
   * 하위 카테고리 조회
   * @param {string} categoryId - 카테고리 ID
   * @returns {Promise<Array>}
   */
  getSubCategories: async (categoryId) => {
    return await axiosInstance.get(`/category/${categoryId}`);
  },

  /**
   * 카테고리 생성
   * @param {Object} data
   * @param {string} data.name - 카테고리명
   * @param {string} [data.parentId] - 부모 카테고리 ID
   * @returns {Promise<Object>}
   */
  createCategory: async (data) => {
    return await axiosInstance.post('/category', data);
  }
};
