/**
 * MyPage API functions
 * 대여 내역, 등록 상품, 찜한 상품 API
 */

import { axiosInstance } from '@/lib/axios/axiosInstance';

export const mypageApi = {
  /**
   * 대여 내역 조회
   * @param {Object} params - 쿼리 파라미터
   * @returns {Promise} 대여 내역
   */
  getRentHistory: (params) => 
    axiosInstance.get('/mypage/rent-history', { params }),

  /**
   * 등록 상품 조회
   * @param {Object} params - 쿼리 파라미터
   * @returns {Promise} 등록 상품 목록
   */
  getRegisteredProducts: (params) => 
    axiosInstance.get('/mypage/registered-products', { params }),

  /**
   * 찜한 상품 조회
   * @param {Object} params - 쿼리 파라미터
   * @returns {Promise} 찜한 상품 목록
   */
  getLikedProducts: (params) => 
    axiosInstance.get('/mypage/liked-products', { params })
};
