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
   * 리뷰 작성 (게시글/사용자/대여 구분 없이 공통)
   * @param {Object} data
   * @param {number} [data.reviewId] - 수정 시에만 사용
   * @param {string} data.title - 리뷰 제목
   * @param {string} data.content - 리뷰 내용
   * @param {string} data.uploadType - 리뷰 구분 타입 ('RENT' | 'BORROW')
   * @param {number} data.rating - 평점 (1~5)
   * @param {number} data.reviewerId - 작성자 ID
   * @param {number} [data.productId] - 리뷰 대상 상품 ID (선택)
   * @param {number} [data.reviewedId] - 리뷰 대상 사용자 ID (선택)
   * @param {number} data.rentalHistoryId - 대여 이력 ID
   * @param {number[]} [data.fileIds] - 첨부 파일 ID 배열
   * @returns {Promise<Object>}
   */
  createReview: async (data) => {
    return await axiosInstance.post(`/review`, data);
  },

  /**
   * 리뷰 수정
   * @param {Object} data
   * @param {number} data.reviewId - 리뷰 ID
   * @param {string} data.title - 리뷰 제목
   * @param {string} data.content - 리뷰 내용
   * @param {number} data.rating - 평점 (1~5)
   * @param {number[]} [data.fileIds] - 업로드한 파일 ID 배열
   * @returns {Promise<Object>}
   */
  updateReview: async (data) => {
    return await axiosInstance.patch(`/review`, data);
  },

  /**
   * 리뷰 삭제
   * @param {string} reviewId - 리뷰 ID
   * @returns {Promise<void>}
   */
  deleteReview: async (reviewId) => {
    return await axiosInstance.delete(`/review/${reviewId}`);
  },

  /**
   * 리뷰 상세 조회 (수정 페이지용)
   * @param {number} reviewId
   * @returns {Promise<Object>}
   */
  getReviewDetail: async (reviewId) => {
    return await axiosInstance.get(`/review/${reviewId}`);
  },

  /**
   * 대여 내역별 리뷰 조회
   * @param {number} rentalId - 대여 내역 ID
   * @param {string} type - 'rent' (빌려준 사람의 리뷰) 또는 'borrow' (빌린 사람의 리뷰)
   * @returns {Promise<Object>}
   */
  getRentalReview: async (rentalId, type) => {
    return await axiosInstance.get(`/review/rental/${rentalId}`, {
      params: { type }
    });
  },
};
