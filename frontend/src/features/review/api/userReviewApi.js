/**
 * User Review API functions
 * 사용자 리뷰 관련 API
 */

import { axiosInstance } from '@/lib/axios/axiosInstance';

export const userReviewApi = {
  /**
   * 사용자 리뷰 목록 조회
   * @param {string} userId - 사용자 ID
   * @param {Object} params - 쿼리 파라미터
   * @returns {Promise} 사용자 리뷰 목록
   */
  getUserReviews: (userId, params) => 
    axiosInstance.get(`/users/${userId}/reviews`, { params }),

  /**
   * 사용자 리뷰 생성
   * @param {string} userId - 사용자 ID
   * @param {Object} reviewData - 리뷰 데이터
   * @returns {Promise} 생성된 리뷰
   */
  createUserReview: (userId, reviewData) => 
    axiosInstance.post(`/users/${userId}/reviews`, reviewData),

  /**
   * 사용자 리뷰 수정
   * @param {string} reviewId - 리뷰 ID
   * @param {Object} reviewData - 수정할 리뷰 데이터
   * @returns {Promise} 수정된 리뷰
   */
  updateUserReview: (reviewId, reviewData) => 
    axiosInstance.put(`/reviews/${reviewId}`, reviewData),

  /**
   * 사용자 리뷰 삭제
   * @param {string} reviewId - 리뷰 ID
   * @returns {Promise} 삭제 응답
   */
  deleteUserReview: (reviewId) => 
    axiosInstance.delete(`/reviews/${reviewId}`)
};
