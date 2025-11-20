/**
 * User Review API functions
 * 사용자 리뷰 관련 API
 */

import { axiosInstance } from '@/lib/axios/axiosInstance';

/**
 * 인물 리뷰 API
 */
export const userReviewApi = {
  /**
   * 인물 리뷰 리스트 조회
   * @param {string} memberId - 회원 ID
   * @param {Object} [params]
   * @param {string} [params.uploadType='RENT'] - 'RENT' (빌려줬을 때) 또는 'BORROW' (빌렸을 때)
   * @param {number} [params.page=1]
   * @param {number} [params.size=20]
   * @returns {Promise<{items: Array, total: number}>}
   */
  getUserReviews: async (memberId, params = {}) => {
    return await axiosInstance.get(`/review/member/${memberId}`, {
      params: {
        uploadType: params.uploadType || "RENT",
        page: params.page || 1,
        size: params.size || 20
      }
    });
  }
};
