/**
 * AI API functions
 * AI 게시글 자동 생성 관련 API
 */

import axios from 'axios';

// 환경 변수에서 AI 서버 URL 가져오기
const AI_API_BASE_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000';

/**
 * AI 게시글 생성 API
 */
export const aiApi = {
  /**
   * AI 게시글 자동 생성 (가격 추천 포함)
   *
   * @param {File} imageFile - 상품 이미지 파일
   * @param {string} uploadType - 업로드 타입 ('RENT' | 'BORROW')
   * @returns {Promise<Object>} { title, description, category_suggestion, confidence, recommended_price, estimated_purchase_price, rental_ratio, price_reasoning }
   */
  generateProductDescription: async (imageFile, uploadType = 'RENT') => {
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('upload_type', uploadType);

      console.log('[aiApi] AI 게시글 생성 요청:', {
        fileName: imageFile.name,
        fileSize: imageFile.size,
        uploadType: uploadType
      });

      const response = await axios.post(`${AI_API_BASE_URL}/api/generate`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60초 타임아웃
      });

      console.log('[aiApi] AI 게시글 생성 응답:', response.data);

      return response.data;
    } catch (error) {
      console.error('[aiApi] AI 게시글 생성 실패:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });

      const errorMessage = error.response?.data?.detail
        || error.response?.data?.error
        || error.message
        || 'AI 게시글 생성에 실패했습니다.';

      throw new Error(errorMessage);
    }
  },

  /**
   * AI 서비스 헬스 체크
   *
   * @returns {Promise<boolean>} AI 서비스 사용 가능 여부
   */
  checkHealth: async () => {
    try {
      const response = await axios.get(`${AI_API_BASE_URL}/health`, {
        timeout: 5000,
      });

      return response.data?.status === 'healthy';
    } catch (error) {
      console.warn('[aiApi] AI 서비스 헬스 체크 실패:', error.message);
      return false;
    }
  }
};
