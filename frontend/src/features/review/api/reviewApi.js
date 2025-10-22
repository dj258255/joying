/**
 * Review API functions
 * 리뷰 관련 API
 */

import { axiosInstance } from '@/lib/axios/axiosInstance';

export const reviewApi = {
  /**
   * 리뷰 목록 조회
   * @param {Object} params - 쿼리 파라미터
   * @returns {Promise} 리뷰 목록
   */
  getReviews: (params) => 
    axiosInstance.get('/reviews', { params }),

  /**
   * 리뷰 생성
   * @param {Object} reviewData - 리뷰 데이터
   * @returns {Promise} 생성된 리뷰
   */
  createReview: (reviewData) => 
    axiosInstance.post('/reviews', reviewData),

  /**
   * 리뷰 수정
   * @param {string} reviewId - 리뷰 ID
   * @param {Object} reviewData - 수정할 리뷰 데이터
   * @returns {Promise} 수정된 리뷰
   */
  updateReview: (reviewId, reviewData) => 
    axiosInstance.put(`/reviews/${reviewId}`, reviewData),

  /**
   * 리뷰 삭제
   * @param {string} reviewId - 리뷰 ID
   * @returns {Promise} 삭제 응답
   */
  deleteReview: (reviewId) => 
    axiosInstance.delete(`/reviews/${reviewId}`)
};
