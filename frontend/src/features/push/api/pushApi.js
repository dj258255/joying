/**
 * Push Notification API functions
 * 브라우저 푸시 알림 관련 API
 */

import { axiosInstance } from '@/lib/axios/axiosInstance';
import { API_ENDPOINTS } from '@/shared/constants';

/**
 * 푸시 알림 관련 API
 */
export const pushApi = {
  /**
   * VAPID 공개키 조회
   * GET /push/vapid-public-key
   * @returns {Promise<string>} VAPID 공개키
   */
  getVapidPublicKey: async () => {
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.PUSH.VAPID_PUBLIC_KEY);
      
      // 응답 데이터 로깅 (디버깅용)
      console.log('[pushApi] VAPID 공개키 응답:', {
        status: response.status,
        dataType: typeof response.data,
        data: response.data,
        isString: typeof response.data === 'string',
        isObject: typeof response.data === 'object',
        hasPublicKey: response.data?.publicKey !== undefined,
        hasData: response.data?.data !== undefined
      });
      
      // 응답이 문자열인 경우
      if (typeof response.data === 'string') {
        const trimmed = response.data.trim();
        if (trimmed) {
          console.log('[pushApi] VAPID 공개키 추출 (문자열):', trimmed.substring(0, 50) + '...');
          return trimmed;
        }
      }
      
      // 응답이 객체인 경우
      if (typeof response.data === 'object' && response.data !== null) {
        // ApiResponse 형식: { status, message, data, timestamp }
        if (response.data.data) {
          const publicKey = typeof response.data.data === 'string' 
            ? response.data.data.trim() 
            : response.data.data?.publicKey || response.data.data;
          if (publicKey && typeof publicKey === 'string') {
            console.log('[pushApi] VAPID 공개키 추출 (data.data):', publicKey.substring(0, 50) + '...');
            return publicKey;
          }
        }
        
        // publicKey 필드가 있는 경우
        if (response.data.publicKey && typeof response.data.publicKey === 'string') {
          const publicKey = response.data.publicKey.trim();
          console.log('[pushApi] VAPID 공개키 추출 (publicKey):', publicKey.substring(0, 50) + '...');
          return publicKey;
        }
        
        // 객체 자체가 공개키 정보를 담고 있는 경우
        if (typeof response.data === 'object') {
          console.warn('[pushApi] 예상치 못한 응답 형식:', response.data);
        }
      }
      
      throw new Error('VAPID 공개키를 응답에서 찾을 수 없습니다.');
    } catch (error) {
      console.error('[pushApi] VAPID 공개키 조회 실패:', error);
      if (error.response) {
        console.error('[pushApi] 응답 데이터:', error.response.data);
        console.error('[pushApi] 응답 상태:', error.response.status);
      }
      throw error;
    }
  },

  /**
   * 푸시 알림 구독 등록
   * POST /push/subscribe
   * @param {Object} subscriptionData - 구독 정보
   * @param {string} subscriptionData.endpoint - 푸시 서비스 엔드포인트 URL
   * @param {string} subscriptionData.p256dh - P256DH 공개키 (Base64 인코딩)
   * @param {string} subscriptionData.auth - Auth Secret (Base64 인코딩)
   * @param {string} [subscriptionData.userAgent] - 사용자 브라우저 정보
   * @returns {Promise<Object>} 응답 메시지
   */
  subscribe: async (subscriptionData) => {
    try {
      const { endpoint, p256dh, auth, userAgent } = subscriptionData;
      
      if (!endpoint || !p256dh || !auth) {
        throw new Error('필수 필드가 누락되었습니다: endpoint, p256dh, auth');
      }

      const requestBody = {
        endpoint,
        p256dh,
        auth,
        ...(userAgent && { userAgent })
      };

      console.log('[pushApi] 푸시 알림 구독 등록 요청:', {
        endpoint: endpoint.substring(0, 50) + '...',
        hasP256dh: !!p256dh,
        hasAuth: !!auth,
        userAgent
      });

      const response = await axiosInstance.post(
        API_ENDPOINTS.PUSH.SUBSCRIBE,
        requestBody
      );

      console.log('[pushApi] 푸시 알림 구독 등록 성공:', response.data);
      return response.data;
    } catch (error) {
      console.error('[pushApi] 푸시 알림 구독 등록 실패:', error);
      throw error;
    }
  },

  /**
   * 푸시 알림 구독 해제
   * POST /push/unsubscribe
   * @param {string} endpoint - 구독 해제할 엔드포인트 URL
   * @returns {Promise<Object>} 응답 메시지
   */
  unsubscribe: async (endpoint) => {
    try {
      if (!endpoint) {
        throw new Error('엔드포인트는 필수입니다');
      }

      console.log('[pushApi] 푸시 알림 구독 해제 요청:', {
        endpoint: endpoint.substring(0, 50) + '...'
      });

      const response = await axiosInstance.post(
        API_ENDPOINTS.PUSH.UNSUBSCRIBE,
        { endpoint }
      );

      console.log('[pushApi] 푸시 알림 구독 해제 성공:', response.data);
      return response.data;
    } catch (error) {
      console.error('[pushApi] 푸시 알림 구독 해제 실패:', error);
      throw error;
    }
  }
};

