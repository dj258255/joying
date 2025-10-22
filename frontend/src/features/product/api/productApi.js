/**
 * Product API functions
 * 상품 CRUD, 찜하기, 대여 불가 날짜 설정 API
 */

import { axiosInstance } from '@/lib/axios/axiosInstance';

/**
 * 상품 관련 API
 */
export const productApi = {
  /**
   * 상품 조회
   * @param {string} productId - 상품 ID
   * @returns {Promise<Object>}
   */
  getProduct: async (productId) => {
    return await axiosInstance.get(`/product/${productId}`);
  },

  /**
   * 상품 등록
   * @param {Object} data
   * @param {string} data.name - 상품명
   * @param {string} data.description - 설명
   * @param {number} data.pricePerDay - 일일 대여료
   * @param {number} data.deposit - 보증금
   * @param {number} data.categoryId - 카테고리 ID
   * @param {string[]} [data.images] - 이미지 URL 목록
   * @param {string[]} [data.hashtags] - 해시태그 목록
   * @returns {Promise<Object>}
   */
  createProduct: async (data) => {
    return await axiosInstance.post('/product', data);
  },

  /**
   * 상품 수정
   * @param {string} productId - 상품 ID
   * @param {Object} data - 수정할 데이터
   * @returns {Promise<Object>}
   */
  updateProduct: async (productId, data) => {
    return await axiosInstance.patch(`/product/${productId}`, data);
  },

  /**
   * 상품 삭제
   * @param {string} productId - 상품 ID
   * @returns {Promise<void>}
   */
  deleteProduct: async (productId) => {
    return await axiosInstance.delete(`/product/${productId}`);
  },

  /**
   * 상품 찜하기
   * @param {string} productId - 상품 ID
   * @returns {Promise<{liked: boolean}>}
   */
  likeProduct: async (productId) => {
    return await axiosInstance.post(`/product/${productId}/like`);
  },

  /**
   * 상품 찜 취소
   * @param {string} productId - 상품 ID
   * @returns {Promise<{liked: boolean}>}
   */
  unlikeProduct: async (productId) => {
    return await axiosInstance.delete(`/product/${productId}/dislike`);
  },

  /**
   * 대여 불가 날짜 설정
   * @param {string} productId - 상품 ID
   * @param {string[]} dates - 불가 날짜 목록 (ISO8601)
   * @returns {Promise<Object>}
   */
  setUnavailableDates: async (productId, dates) => {
    return await axiosInstance.post(`/product/${productId}/disable`, { dates });
  }
};
