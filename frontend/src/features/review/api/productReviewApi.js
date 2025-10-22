/**
 * Product Review API functions
 * 상품 리뷰 관련 API
 */

import { axiosInstance } from '@/lib/axios/axiosInstance';

export const productReviewApi = {
  /**
   * 상품 리뷰 목록 조회
   * @param {string} productId - 상품 ID
   * @param {Object} params - 쿼리 파라미터
   * @returns {Promise} 상품 리뷰 목록
   */
  getProductReviews: (productId, params) => 
    axiosInstance.get(`/products/${productId}/reviews`, { params }),

  /**
   * 상품 리뷰 생성
   * @param {string} productId - 상품 ID
   * @param {Object} reviewData - 리뷰 데이터
   * @returns {Promise} 생성된 리뷰
   */
  createProductReview: (productId, reviewData) => 
    axiosInstance.post(`/products/${productId}/reviews`, reviewData),

  /**
   * 상품 리뷰 수정
   * @param {string} reviewId - 리뷰 ID
   * @param {Object} reviewData - 수정할 리뷰 데이터
   * @returns {Promise} 수정된 리뷰
   */
  updateProductReview: (reviewId, reviewData) => 
    axiosInstance.put(`/reviews/${reviewId}`, reviewData),

  /**
   * 상품 리뷰 삭제
   * @param {string} reviewId - 리뷰 ID
   * @returns {Promise} 삭제 응답
   */
  deleteProductReview: (reviewId) => 
    axiosInstance.delete(`/reviews/${reviewId}`)
};
