/**
 * MyPage API functions
 * 대여 내역, 등록 상품, 찜한 상품 API
 */

import { axiosInstance } from '@/lib/axios/axiosInstance';

/**
 * 마이페이지 API
 * 참고: 대여 내역은 rentalApi를 사용합니다 (/rentals/borrowed/history, /rentals/lend/history)
 */
export const mypageApi = {
  /**
   * 등록한 상품 목록
   * @param {Object} [params]
   * @param {number} [params.page=1]
   * @param {number} [params.size=20]
   * @returns {Promise<{items: Array, total: number}>}
   */
  getRegisteredProducts: async (params = {}) => {
    return await axiosInstance.get('/mypage/items', {
      params: {
        page: params.page || 1,
        size: params.size || 20
      }
    });
  },

  /**
   * 찜한 상품 조회
   * @param {Object} [params]
   * @param {number} [params.page=1]
   * @param {number} [params.size=20]
   * @returns {Promise<{items: Array, total: number}>}
   */
  getLikedProducts: async (params = {}) => {
    return await axiosInstance.get('/mypage/likes', {
      params: {
        page: params.page || 1,
        size: params.size || 20
      }
    });
  },

  /**
   * 내 채팅방 목록 조회
   * @param {Object} [params]
   * @param {number} [params.page=1]
   * @param {number} [params.size=20]
   * @returns {Promise<{items: Array, total: number}>}
   */
  getMyChatRooms: async (params = {}) => {
    return await axiosInstance.get('/mypage/chats', {
      params: {
        page: params.page || 1,
        size: params.size || 20
      }
    });
  }
};
