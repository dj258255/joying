/**
 * Rental API functions
 * 대여 거래 관련 API
 */

import { axiosInstance } from '@/lib/axios/axiosInstance';

/**
 * 대여 거래 관련 API
 */
export const rentalApi = {
  /**
   * 대여 거래 생성 (예약)
   * @param {number|string} productId - 상품 ID
   * @param {Object} data - 대여 거래 데이터
   * @param {string} data.startRen - 대여 시작 일시 (ISO-8601)
   * @param {string} data.endRen - 대여 종료 일시 (ISO-8601)
   * @param {string} data.rentMethod - 대여 방법 ('DELIVERY' | 'MEET' | 'BOTH')
   * @returns {Promise<Object>} 생성된 대여 거래 정보
   */
  createRentalReservation: async (productId, data) => {
    const productIdNum = Number(productId);
    if (isNaN(productIdNum)) {
      throw new Error(`유효하지 않은 상품 ID: ${productId}`);
    }

    const startRen = typeof data.startRen === 'string'
      ? data.startRen
      : new Date(data.startRen).toISOString();
    const endRen = typeof data.endRen === 'string'
      ? data.endRen
      : new Date(data.endRen).toISOString();

    const validRentMethods = ['DELIVERY', 'MEET', 'BOTH'];
    const rentMethod = validRentMethods.includes(data.rentMethod)
      ? data.rentMethod
      : 'BOTH';

    const requestBody = {
      startRen,
      endRen,
      rentMethod
    };

    console.log('[rentalApi] 요청 준비:', {
      productId: productIdNum,
      requestBody,
      'requestBody (stringified)': JSON.stringify(requestBody),
      'startRen 타입': typeof startRen,
      'endRen 타입': typeof endRen
    });

    try {
      const response = await axiosInstance.post(
        `/rentals/${productIdNum}/reservations`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('[rentalApi] 응답 성공:', response.data);
      return response.data;
    } catch (error) {
      console.error('[rentalApi] 요청 실패:', {
        url: `/rentals/${productIdNum}/reservations`,
        requestBody,
        error: error.response?.data || error.message,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      throw error;
    }
  },

  /**
   * 거래 상세 조회
   * @param {number} rentalHisId - 대여 이력 ID
   * @returns {Promise<Object>} 거래 상세 정보
   */
  getRentalDetail: async (rentalHisId) => {
    const response = await axiosInstance.get(`/rentals/rental-histories/${rentalHisId}`);
    return response.data;
  },

  /**
   * 발송 처리 (운송장 번호 등록)
   * @param {number} rentalHisId - 대여 이력 ID
   * @param {Object} data - 발송 데이터
   * @param {string} data.carrierCode - 택배사 코드
   * @param {string} data.trackingNo - 운송장 번호
   * @returns {Promise<Object>}
   */
  shipItem: async (rentalHisId, data) => {
    const requestBody = {
      carrierCode: data.carrierCode || data.courier,
      trackingNo: data.trackingNo || data.trackingNumber
    };

    const response = await axiosInstance.patch(
      `/rentals/rental-histories/${rentalHisId}/ship`,
      requestBody
    );
    return response.data;
  },

  /**
   * 수령 확인
   * @param {number} rentalHisId - 대여 이력 ID
   * @returns {Promise<Object>}
   */
  confirmReceive: async (rentalHisId) => {
    const response = await axiosInstance.patch(
      `/rentals/rental-histories/${rentalHisId}/confirm-receive`
    );
    return response.data;
  },

  /**
   * 반납 처리 (운송장 번호 등록)
   * @param {number} rentalHisId - 대여 이력 ID
   * @param {Object} data - 반납 데이터
   * @param {string} data.carrierCode - 택배사 코드
   * @param {string} data.trackingNo - 운송장 번호
   * @returns {Promise<Object>}
   */
  returnItem: async (rentalHisId, data) => {
    const requestBody = {
      carrierCode: data.carrierCode || data.courier,
      trackingNo: data.trackingNo || data.trackingNumber
    };

    const response = await axiosInstance.patch(
      `/rentals/rental-histories/${rentalHisId}/return`,
      requestBody
    );
    return response.data;
  },

  /**
   * 회수 확인 (반납 완료)
   * @param {number} rentalHisId - 대여 이력 ID
   * @returns {Promise<Object>}
   */
  confirmReturn: async (rentalHisId) => {
    const response = await axiosInstance.patch(
      `/rentals/rental-histories/${rentalHisId}/confirm-return`
    );
    return response.data;
  },

  /**
   * 영상 업로드
   * @param {number} rentalHisId - 대여 이력 ID
   * @param {Object} data - 영상 데이터
   * @param {number} data.fileId - 파일 ID (fileApi.uploadFile로 업로드한 파일의 ID)
   * @param {string} data.videoType - 영상 타입 ('OWNER_SEND' | 'RENTER_RECEIVE' | 'RENTER_RETURN' | 'OWNER_RECEIVE')
   * @returns {Promise<Object>}
   */
  uploadVideo: async (rentalHisId, data) => {
    const requestBody = {
      fileId: data.fileId,
      videoType: data.videoType
    };

    const response = await axiosInstance.post(
      `/rentals/rental-histories/${rentalHisId}/video`,
      requestBody
    );
    return response.data;
  },

  /**
   * 영상 목록 조회
   * @param {number} rentalHisId - 대여 이력 ID
   * @returns {Promise<Object>}
   */
  getVideos: async (rentalHisId) => {
    const response = await axiosInstance.get(
      `/rentals/rental-histories/${rentalHisId}/video`
    );
    return response.data;
  },

  /**
   * 거래 취소 요청
   * @param {number} rentalHisId - 대여 이력 ID
   * @param {Object} data - 취소 요청 데이터
   * @param {string} data.reason - 취소 사유
   * @param {number} data.depositOwnerAmt - 보증금 소유자 몫 (금액)
   * @param {number} data.depositRenterAmt - 보증금 대여자 몫 (금액)
   * @returns {Promise<Object>}
   */
  createCancelRequest: async (rentalHisId, data) => {
    const requestBody = {
      reason: data.reason,
      depositOwnerAmt: data.depositOwnerAmt,
      depositRenterAmt: data.depositRenterAmt
    };

    const response = await axiosInstance.post(
      `/rentals/rental-histories/${rentalHisId}/cancel`,
      requestBody
    );
    return response.data;
  },

  /**
   * 취소 요청 조회
   * @param {number} rentalHisId - 대여 이력 ID
   * @returns {Promise<Object>}
   */
  getCancelRequest: async (rentalHisId) => {
    const response = await axiosInstance.get(
      `/rentals/rental-histories/${rentalHisId}/cancel`
    );
    return response.data;
  },

  /**
   * 취소 승인
   * @param {number} cancelId - 취소 요청 ID
   * @returns {Promise<Object>}
   */
  approveCancel: async (cancelId) => {
    const response = await axiosInstance.patch(
      `/rentals/rental-cancel-requests/${cancelId}/approve`
    );
    return response.data;
  },

  /**
   * 취소 거부
   * @param {number} cancelId - 취소 요청 ID
   * @param {Object} data - 거부 데이터
   * @param {string} data.reason - 거부 사유
   * @returns {Promise<Object>}
   */
  rejectCancel: async (cancelId, data) => {
    const response = await axiosInstance.patch(
      `/rentals/rental-cancel-requests/${cancelId}/reject`,
      data
    );
    return response.data;
  }
};
