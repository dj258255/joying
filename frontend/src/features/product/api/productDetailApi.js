/**
 * Product Detail API
 * 상품 상세 조회 API 연동
 */

import { axiosInstance } from '@/lib/axios/axiosInstance';
import { API_ENDPOINTS } from '@/shared/constants/apiEndpoints';

/**
 * 상품 상세 조회
 * @param {number|string} productId - 상품 ID
 * @returns {Promise<Object>} 상세 응답 객체 (data 필드 내 상품 상세)
 */
export const getProductDetail = async (productId) => {
  // productId가 유효한 값인지 확인
  if (!productId || (typeof productId !== 'string' && typeof productId !== 'number')) {
    throw new Error('Invalid productId: ' + productId);
  }
  
  // 문자열로 변환하여 URL에 사용
  const idString = String(productId);
  const url = API_ENDPOINTS.PRODUCT.BY_ID(idString);
  const response = await axiosInstance.get(url);
  
  // 응답 구조: { status, message, data, timestamp } 또는 { body: { data, ... }, ... }
  // 실제 응답이 res.data.body.data 구조일 수 있으므로 확인
  if (response.data?.body?.data) {
    return response.data;
  }
  
  return response.data; // 서버가 { status, message, data, timestamp } 형태를 반환하면 상위에서 data 사용
};


