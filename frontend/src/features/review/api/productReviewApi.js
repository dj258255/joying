/**
 * Product Review API functions
 * 상품 리뷰 관련 API
 */

import { axiosInstance } from '@/lib/axios/axiosInstance';

/**
 * 게시글(상품) 리뷰 API
 */
export const productReviewApi = {
  /**
   * 게시글 리뷰 리스트 조회
   * @param {string} rentalId - 대여 ID
   * @param {Object} [params]
   * @param {number} [params.page=1]
   * @param {number} [params.size=20]
   * @returns {Promise<{items: Array, total: number}>}
   */
  getProductReviews: async (productId, params = {}) => {
    return await axiosInstance.get(`/review/product/${productId}`, {
      params: {
        page: params.page || 1,
        size: params.size || 20
      }
    });
  },

  /**
   * 대여에 작성한 리뷰 조회
   * @param {string} rentalId - 대여 ID
   * @param {string} memberId - 회원 ID
   * @returns {Promise<Object|null>}
   */
  getMyReviewForRental: async (rentalId, memberId) => {
    return await axiosInstance.get(`/review/rental/${rentalId}/member/${memberId}`);
  }
};
