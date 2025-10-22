/**
 * Product API functions
 * 상품 CRUD, 찜하기, 대여 불가 날짜 설정 API
 */

import { axiosInstance } from '@/lib/axios/axiosInstance';

export const productApi = {
  /**
   * 상품 목록 조회
   * @param {Object} params - 쿼리 파라미터
   * @returns {Promise} 상품 목록
   */
  getProducts: (params) => 
    axiosInstance.get('/products', { params }),

  /**
   * 상품 상세 조회
   * @param {string} productId - 상품 ID
   * @returns {Promise} 상품 상세 정보
   */
  getProduct: (productId) => 
    axiosInstance.get(`/products/${productId}`),

  /**
   * 상품 생성
   * @param {Object} productData - 상품 데이터
   * @returns {Promise} 생성된 상품
   */
  createProduct: (productData) => 
    axiosInstance.post('/products', productData),

  /**
   * 상품 수정
   * @param {string} productId - 상품 ID
   * @param {Object} productData - 수정할 상품 데이터
   * @returns {Promise} 수정된 상품
   */
  updateProduct: (productId, productData) => 
    axiosInstance.put(`/products/${productId}`, productData),

  /**
   * 상품 삭제
   * @param {string} productId - 상품 ID
   * @returns {Promise} 삭제 응답
   */
  deleteProduct: (productId) => 
    axiosInstance.delete(`/products/${productId}`),

  /**
   * 상품 찜하기
   * @param {string} productId - 상품 ID
   * @returns {Promise} 찜하기 응답
   */
  likeProduct: (productId) => 
    axiosInstance.post(`/products/${productId}/like`),

  /**
   * 상품 찜하기 취소
   * @param {string} productId - 상품 ID
   * @returns {Promise} 찜하기 취소 응답
   */
  unlikeProduct: (productId) => 
    axiosInstance.delete(`/products/${productId}/like`),

  /**
   * 대여 불가 날짜 설정
   * @param {string} productId - 상품 ID
   * @param {Object} unavailableDates - 대여 불가 날짜 데이터
   * @returns {Promise} 설정 응답
   */
  setUnavailableDates: (productId, unavailableDates) => 
    axiosInstance.put(`/products/${productId}/unavailable-dates`, unavailableDates)
};
