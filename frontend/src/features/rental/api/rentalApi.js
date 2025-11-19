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
   * @param {string} data.rentMethod - 대여 방법 ('ONLY_ONLINE' | 'ONLY_OFFLINE' | 'BOTH')
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

    // 백엔드 RentMethod enum에 맞게 수정
    const validRentMethods = ['ONLY_ONLINE', 'ONLY_OFFLINE', 'BOTH'];
    const rentMethod = validRentMethods.includes(data.rentMethod)
      ? data.rentMethod
      : 'BOTH';

    const requestBody = {
      ...data,
      startRen,
      endRen,
      rentMethod
    };

    ': JSON.stringify(requestBody),
      'startRen 타입': typeof startRen,
      'endRen 타입': typeof endRen,
      'renterId': requestBody.renterId,
      'renterId 타입': typeof requestBody.renterId
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

      
      return response.data;
    } catch (error) {
      const errorData = error.response?.data || {};
      ': JSON.stringify(requestBody),
        error: errorData,
        errorMessage: errorData.message || error.message,
        errorCode: errorData.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        'renterId 전달 여부': !!requestBody.renterId,
        'renterId 값': requestBody.renterId
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
    try {
    const response = await axiosInstance.get(`/rentals/rental-histories/${rentalHisId}`);
      
      
      
      // 응답 구조: { status, message, data: {... }, timestamp }
      // 또는 axios 응답: { data: { status, message, data: {... }, timestamp } }
      if (response.data?.data) {
        return response.data.data;
      }
      
    return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * 상품의 최신 대여 거래 조회
   * @param {number|string} productId - 상품 ID
   * @returns {Promise<Object>} 최신 대여 거래 정보
   */
  getLatestRentalByProduct: async (productId) => {
    const productIdNum = Number(productId);
    if (isNaN(productIdNum)) {
      throw new Error(`유효하지 않은 상품 ID: ${productId}`);
    }

    

    try {
      const response = await axiosInstance.get(`/rentals/products/${productIdNum}/latest`);
      
      return response.data;
    } catch (error) {
      throw error;
    }
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
   * 반납 수령 확인 및 정산 처리 (confirm-return이 정산까지 처리함)
   * @param {number} rentalHisId - 대여 이력 ID
   * @returns {Promise<Object>}
   */
  confirmReturnReceive: async (rentalHisId) => {
    // 백엔드에는 confirm-return-receive 엔드포인트가 없고 confirm-return만 있음
    // confirm-return이 이미 정산 처리까지 포함하고 있음
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
  },

  /**
   * 내가 빌린 대여 내역 조회
   * @param {Object} params - 쿼리 파라미터
   * @param {number} params.page - 페이지 번호 (0부터 시작)
   * @param {number} params.size - 페이지 크기
   * @returns {Promise<Object>} 페이징된 대여 내역
   */
  getBorrowedHistory: async (params = {}) => {
    const { page = 0, size = 20 } = params;
    
    try {
      const response = await axiosInstance.get('/rentals/borrowed/history', {
        params: { page, size }
      });
      
      
      
      // 응답 구조: { status, message, data: { content, pageable, ... }, timestamp }
      if (response.data?.data) {
        return response.data.data;
      }
      
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * 내가 빌려준 대여 내역 조회
   * @param {Object} params - 쿼리 파라미터
   * @param {number} params.page - 페이지 번호 (0부터 시작)
   * @param {number} params.size - 페이지 크기
   * @returns {Promise<Object>} 페이징된 대여 내역
   */
  getLentHistory: async (params = {}) => {
    const { page = 0, size = 20 } = params;
    
    try {
      const response = await axiosInstance.get('/rentals/lend/history', {
        params: { page, size }
      });
      
      
      
      // 응답 구조: { status, message, data: { content, pageable, ... }, timestamp }
      if (response.data?.data) {
        return response.data.data;
      }
      
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * 대여 기간 연장
   * @param {number} rentalHisId - 대여 이력 ID
   * @param {Object} data - 연장 데이터
   * @param {string} data.newEndRen - 새로운 종료 일시 (ISO-8601)
   * @param {number} data.additionalFee - 추가 대여료
   * @returns {Promise<Object>} 연장 결과
   */
  extendRental: async (rentalHisId, data) => {
    const requestBody = {
      newEndRen: typeof data.newEndRen === 'string'
        ? data.newEndRen
        : new Date(data.newEndRen).toISOString(),
      additionalFee: Number(data.additionalFee)
    };

    try {
      const response = await axiosInstance.patch(
        `/rentals/rental-histories/${rentalHisId}/extend`,
        requestBody
      );

      

      // 응답 구조: { status, message, data: {...}, timestamp }
      if (response.data?.data) {
        return response.data.data;
      }

      return response.data;
    } catch (error) {
      throw error;
    }
  }
};
