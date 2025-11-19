/**
 * Transaction Step Utility Functions
 * 거래 단계별 완료 여부 확인 및 버튼 활성화 관리
 */

import { rentalApi } from '@/features/rental/api/rentalApi';

/**
 * 거래 단계 상수
 */
export const TRANSACTION_STEPS = {
  CREATE: 'CREATE',
  PAYMENT: 'PAYMENT',
  SHIPPING_VIDEO: 'SHIPPING_VIDEO',
  SHIPPING_TRACKING: 'SHIPPING_TRACKING',
  RECEIVE: 'RECEIVE',
  RETURN_VIDEO: 'RETURN_VIDEO',
  RETURN_TRACKING: 'RETURN_TRACKING',
  RETURN_RECEIVE: 'RETURN_RECEIVE',
  COMPLETED: 'COMPLETED'
};

/**
 * 단계 순서 정의
 */
const STEP_ORDER = [
  TRANSACTION_STEPS.CREATE,
  TRANSACTION_STEPS.PAYMENT,
  TRANSACTION_STEPS.SHIPPING_VIDEO,
  TRANSACTION_STEPS.SHIPPING_TRACKING,
  TRANSACTION_STEPS.RECEIVE,
  TRANSACTION_STEPS.RETURN_VIDEO,
  TRANSACTION_STEPS.RETURN_TRACKING,
  TRANSACTION_STEPS.RETURN_RECEIVE,
  TRANSACTION_STEPS.COMPLETED
];

/**
 * 거래 단계별 완료 여부 확인
 * @param {string} step - 확인할 단계
 * @param {Object} rentalData - 거래 데이터
 * @param {number} rentalHisId - 거래 이력 ID
 * @param {Array} videos - 영상 목록 (선택적, 없으면 API 호출)
 * @returns {Promise<boolean>} 완료 여부
 */
export const checkStepCompleted = async (step, rentalData, rentalHisId, videos = null) => {
  if (!rentalData && !rentalHisId) return false;

  switch (step) {
    case TRANSACTION_STEPS.CREATE:
      return !!rentalData?.rentalHisId || !!rentalHisId;

    case TRANSACTION_STEPS.PAYMENT:
      const status = rentalData?.status || rentalData?.rentalStatus;
      return status === 'ESCROW' || 
             status === 'PAYMENT_COMPLETED' ||
             status === 'SHIPPED' ||
             status === 'RENTING' ||
             status === 'RETURN_REQUESTED' ||
             status === 'RETURNED' ||
             status === 'COMPLETED' ||
             status === 'DEPOSIT_RETURNED';

    case TRANSACTION_STEPS.SHIPPING_VIDEO:
      if (!rentalHisId) return false;
      try {
        const videoList = videos || await rentalApi.getVideos(rentalHisId);
        const videoArray = Array.isArray(videoList) 
          ? videoList 
          : videoList?.data?.data?.videos 
          || videoList?.data?.videos 
          || videoList?.videos 
          || [];
        return videoArray.some(v => 
          v.videoType === 'OWNER_SEND' || 
          v.type === 'OWNER_SEND'
        );
      } catch (err) {
        
        return false;
      }

    case TRANSACTION_STEPS.SHIPPING_TRACKING:
      return !!(rentalData?.outboundTrackingNo || rentalData?.outboundTrackingNumber);

    case TRANSACTION_STEPS.RECEIVE:
      const receiveStatus = rentalData?.status || rentalData?.rentalStatus;
      return receiveStatus === 'RENTING' ||
             receiveStatus === 'RETURN_REQUESTED' ||
             receiveStatus === 'RETURNED' ||
             receiveStatus === 'COMPLETED' ||
             receiveStatus === 'DEPOSIT_RETURNED';

    case TRANSACTION_STEPS.RETURN_VIDEO:
      if (!rentalHisId) return false;
      try {
        const returnVideoList = videos || await rentalApi.getVideos(rentalHisId);
        const returnVideoArray = Array.isArray(returnVideoList)
          ? returnVideoList
          : returnVideoList?.data?.data?.videos
          || returnVideoList?.data?.videos
          || returnVideoList?.videos
          || [];
        return returnVideoArray.some(v =>
          v.videoType === 'RENTER_RETURN' ||
          v.type === 'RENTER_RETURN'
        );
      } catch (err) {
        
        return false;
      }

    case TRANSACTION_STEPS.RETURN_TRACKING:
      return !!(rentalData?.returnTrackingNo || rentalData?.returnTrackingNumber);

    case TRANSACTION_STEPS.RETURN_RECEIVE:
      const returnReceiveStatus = rentalData?.status || rentalData?.rentalStatus;
      return returnReceiveStatus === 'COMPLETED' ||
             returnReceiveStatus === 'DEPOSIT_RETURNED';

    case TRANSACTION_STEPS.COMPLETED:
      const completedStatus = rentalData?.status || rentalData?.rentalStatus;
      return completedStatus === 'COMPLETED' ||
             completedStatus === 'DEPOSIT_RETURNED';

    default:
      return false;
  }
};

/**
 * 현재 거래 단계 확인
 * @param {Object} rentalData - 거래 데이터
 * @returns {string} 현재 단계
 */
export const getCurrentStep = (rentalData) => {
  if (!rentalData) return TRANSACTION_STEPS.CREATE;

  const status = rentalData.status || rentalData.rentalStatus;

  if (!rentalData.rentalHisId) {
    return TRANSACTION_STEPS.CREATE;
  }

  if (status === 'PENDING' || status === 'PAYMENT_PENDING') {
    return TRANSACTION_STEPS.PAYMENT;
  }

  if (status === 'ESCROW' || status === 'PAYMENT_COMPLETED') {
    // 발송 전 영상과 송장 번호 확인 필요
    if (rentalData.outboundTrackingNo || rentalData.outboundTrackingNumber) {
      return TRANSACTION_STEPS.SHIPPING_TRACKING;
    }
    return TRANSACTION_STEPS.SHIPPING_VIDEO;
  }

  if (status === 'SHIPPED') {
    return TRANSACTION_STEPS.RECEIVE;
  }

  if (status === 'RENTING') {
    // 반납 영상과 송장 번호 확인 필요
    if (rentalData.returnTrackingNo || rentalData.returnTrackingNumber) {
      return TRANSACTION_STEPS.RETURN_TRACKING;
    }
    return TRANSACTION_STEPS.RETURN_VIDEO;
  }

  if (status === 'RETURN_REQUESTED' || status === 'RETURNED') {
    return TRANSACTION_STEPS.RETURN_RECEIVE;
  }

  if (status === 'COMPLETED' || status === 'DEPOSIT_RETURNED') {
    return TRANSACTION_STEPS.COMPLETED;
  }

  return TRANSACTION_STEPS.CREATE;
};

/**
 * 버튼 활성화 여부 결정
 * @param {string} buttonStep - 버튼이 속한 단계
 * @param {Object} rentalData - 거래 데이터
 * @param {number} rentalHisId - 거래 이력 ID
 * @param {Array} videos - 영상 목록 (선택적)
 * @returns {Promise<{enabled: boolean, reason?: string}>} 활성화 여부 및 이유
 */
export const checkButtonEnabled = async (buttonStep, rentalData, rentalHisId, videos = null) => {
  const currentStep = getCurrentStep(rentalData);
  const buttonIndex = STEP_ORDER.indexOf(buttonStep);
  const currentIndex = STEP_ORDER.indexOf(currentStep);

  // 현재 단계보다 이전 단계면 비활성화 (이미 완료됨)
  if (buttonIndex < currentIndex) {
    return {
      enabled: false,
      reason: '이미 완료된 단계입니다'
    };
  }

  // 현재 단계면 활성화
  if (buttonIndex === currentIndex) {
    return { enabled: true };
  }

  // 다음 단계는 이전 단계 완료 여부 확인
  if (buttonIndex > 0) {
    const prevStep = STEP_ORDER[buttonIndex - 1];
    const prevCompleted = await checkStepCompleted(prevStep, rentalData, rentalHisId, videos);
    
    if (!prevCompleted) {
      return {
        enabled: false,
        reason: '이전 단계를 먼저 완료해주세요'
      };
    }
  }

  return { enabled: true };
};

/**
 * 단계별 완료 여부를 한 번에 확인 (성능 최적화)
 * @param {Object} rentalData - 거래 데이터
 * @param {number} rentalHisId - 거래 이력 ID
 * @returns {Promise<Object>} 각 단계별 완료 여부
 */
export const checkAllSteps = async (rentalData, rentalHisId) => {
  if (!rentalData && !rentalHisId) {
    return {
      [TRANSACTION_STEPS.CREATE]: false,
      [TRANSACTION_STEPS.PAYMENT]: false,
      [TRANSACTION_STEPS.SHIPPING_VIDEO]: false,
      [TRANSACTION_STEPS.SHIPPING_TRACKING]: false,
      [TRANSACTION_STEPS.RECEIVE]: false,
      [TRANSACTION_STEPS.RETURN_VIDEO]: false,
      [TRANSACTION_STEPS.RETURN_TRACKING]: false,
      [TRANSACTION_STEPS.RETURN_RECEIVE]: false,
      [TRANSACTION_STEPS.COMPLETED]: false
    };
  }

  // 영상 목록 한 번만 가져오기 (성능 최적화)
  let videos = null;
  if (rentalHisId) {
    try {
      const videoResponse = await rentalApi.getVideos(rentalHisId);
      videos = Array.isArray(videoResponse)
        ? videoResponse
        : videoResponse?.data?.data?.videos
        || videoResponse?.data?.videos
        || videoResponse?.videos
        || [];
    } catch (err) {
      
      videos = [];
    }
  }

  // 모든 단계 확인 (병렬 처리)
  const [
    create,
    payment,
    shippingVideo,
    shippingTracking,
    receive,
    returnVideo,
    returnTracking,
    returnReceive,
    completed
  ] = await Promise.all([
    checkStepCompleted(TRANSACTION_STEPS.CREATE, rentalData, rentalHisId, videos),
    checkStepCompleted(TRANSACTION_STEPS.PAYMENT, rentalData, rentalHisId, videos),
    checkStepCompleted(TRANSACTION_STEPS.SHIPPING_VIDEO, rentalData, rentalHisId, videos),
    checkStepCompleted(TRANSACTION_STEPS.SHIPPING_TRACKING, rentalData, rentalHisId, videos),
    checkStepCompleted(TRANSACTION_STEPS.RECEIVE, rentalData, rentalHisId, videos),
    checkStepCompleted(TRANSACTION_STEPS.RETURN_VIDEO, rentalData, rentalHisId, videos),
    checkStepCompleted(TRANSACTION_STEPS.RETURN_TRACKING, rentalData, rentalHisId, videos),
    checkStepCompleted(TRANSACTION_STEPS.RETURN_RECEIVE, rentalData, rentalHisId, videos),
    checkStepCompleted(TRANSACTION_STEPS.COMPLETED, rentalData, rentalHisId, videos)
  ]);

  return {
    [TRANSACTION_STEPS.CREATE]: create,
    [TRANSACTION_STEPS.PAYMENT]: payment,
    [TRANSACTION_STEPS.SHIPPING_VIDEO]: shippingVideo,
    [TRANSACTION_STEPS.SHIPPING_TRACKING]: shippingTracking,
    [TRANSACTION_STEPS.RECEIVE]: receive,
    [TRANSACTION_STEPS.RETURN_VIDEO]: returnVideo,
    [TRANSACTION_STEPS.RETURN_TRACKING]: returnTracking,
    [TRANSACTION_STEPS.RETURN_RECEIVE]: returnReceive,
    [TRANSACTION_STEPS.COMPLETED]: completed
  };
};

