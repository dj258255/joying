/**
 * Review API functions
 * 리뷰 관련 API
 */

import { axiosInstance } from '@/lib/axios/axiosInstance';

/**
 * 리뷰 공통 API
 */
export const reviewApi = {
  /**
   * 리뷰 수정
   * @param {string} reviewId - 리뷰 ID
   * @param {Object} data
   * @param {number} data.rating - 평점 (1-5)
   * @param {string} data.content - 내용
   * @returns {Promise<Object>}
   */
  updateReview: async (reviewId, data) => {
    return await axiosInstance.patch(`/review/${reviewId}`, data);
  },

  /**
   * 리뷰 삭제
   * @param {string} reviewId - 리뷰 ID
   * @returns {Promise<void>}
   */
  deleteReview: async (reviewId) => {
    return await axiosInstance.delete(`/review/${reviewId}`);
  }
};
