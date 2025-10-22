/**
 * FSM (Finite State Machine) 유틸리티
 * 11단계 거래 프로세스 상태 관리
 */

import { FSM_STATES } from '@/shared/constants/fsmStates';

/**
 * FSM 상태 전환 규칙
 */
export const FSM_TRANSITIONS = {
  [FSM_STATES.PENDING_ACCEPTANCE]: {
    accept: FSM_STATES.DEPOSIT_PENDING,
    reject: FSM_STATES.CANCELLED
  },
  [FSM_STATES.DEPOSIT_PENDING]: {
    payDeposit: FSM_STATES.RENTAL_FEE_PENDING
  },
  [FSM_STATES.RENTAL_FEE_PENDING]: {
    payRentalFee: FSM_STATES.AWAITING_OUTBOUND_SHIPPING
  },
  [FSM_STATES.AWAITING_OUTBOUND_SHIPPING]: {
    inputTracking: FSM_STATES.OUTBOUND_SHIPPING_IN_PROGRESS
  },
  [FSM_STATES.OUTBOUND_SHIPPING_IN_PROGRESS]: {
    deliveryComplete: FSM_STATES.AWAITING_DELIVERY_CONFIRMATION
  },
  [FSM_STATES.AWAITING_DELIVERY_CONFIRMATION]: {
    confirmDelivery: FSM_STATES.IN_USE
  },
  [FSM_STATES.IN_USE]: {
    rentalEnd: FSM_STATES.AWAITING_RETURN_SHIPPING,
    extendApproved: FSM_STATES.IN_USE // endDate 업데이트
  },
  [FSM_STATES.AWAITING_RETURN_SHIPPING]: {
    inputReturnTracking: FSM_STATES.RETURN_SHIPPING_IN_PROGRESS
  },
  [FSM_STATES.RETURN_SHIPPING_IN_PROGRESS]: {
    returnComplete: FSM_STATES.AWAITING_RETURN_CONFIRMATION
  },
  [FSM_STATES.AWAITING_RETURN_CONFIRMATION]: {
    confirmReturnNormal: FSM_STATES.COMPLETED,
    confirmReturnDamaged: FSM_STATES.DISPUTED
  },
  [FSM_STATES.DISPUTED]: {
    resolved: FSM_STATES.COMPLETED
  }
};

/**
 * 다음 상태 가져오기
 * @param {string} currentState - 현재 상태
 * @param {string} action - 액션
 * @returns {string|null} 다음 상태 또는 null
 */
export const getNextState = (currentState, action) => {
  return FSM_TRANSITIONS[currentState]?.[action] || null;
};

/**
 * 상태 전환 가능 여부 확인
 * @param {string} currentState - 현재 상태
 * @param {string} action - 액션
 * @returns {boolean} 전환 가능 여부
 */
export const canTransition = (currentState, action) => {
  return !!FSM_TRANSITIONS[currentState]?.[action];
};

/**
 * 역할별 가능한 액션 가져오기
 * @param {string} state - 현재 상태
 * @param {string} role - 'renter' | 'lender'
 * @returns {string[]} 가능한 액션 배열
 */
export const getRoleActions = (state, role) => {
  const actions = {
    [FSM_STATES.PENDING_ACCEPTANCE]: {
      renter: ['cancel'],
      lender: ['accept', 'reject']
    },
    [FSM_STATES.DEPOSIT_PENDING]: {
      renter: ['payDeposit'],
      lender: []
    },
    [FSM_STATES.RENTAL_FEE_PENDING]: {
      renter: ['payRentalFee'],
      lender: []
    },
    [FSM_STATES.AWAITING_OUTBOUND_SHIPPING]: {
      renter: [],
      lender: ['inputTracking']
    },
    [FSM_STATES.OUTBOUND_SHIPPING_IN_PROGRESS]: {
      renter: [],
      lender: []
    },
    [FSM_STATES.AWAITING_DELIVERY_CONFIRMATION]: {
      renter: ['confirmDelivery', 'recordVideo'],
      lender: []
    },
    [FSM_STATES.IN_USE]: {
      renter: ['requestExtend', 'requestEarlyReturn'],
      lender: ['approveExtend', 'rejectExtend', 'approveEarlyReturn']
    },
    [FSM_STATES.AWAITING_RETURN_SHIPPING]: {
      renter: ['inputReturnTracking'],
      lender: []
    },
    [FSM_STATES.RETURN_SHIPPING_IN_PROGRESS]: {
      renter: [],
      lender: []
    },
    [FSM_STATES.AWAITING_RETURN_CONFIRMATION]: {
      renter: [],
      lender: ['confirmReturn', 'recordVideo', 'reportDamage']
    },
    [FSM_STATES.COMPLETED]: {
      renter: ['writeReview'],
      lender: ['writeReview']
    },
    [FSM_STATES.DISPUTED]: {
      renter: ['submitEvidence'],
      lender: ['submitEvidence']
    }
  };

  return actions[state]?.[role] || [];
};

/**
 * 상태별 시스템 메시지 가져오기
 * @param {string} state - 현재 상태
 * @param {Object} data - 추가 데이터 (날짜, 금액 등)
 * @returns {string} 시스템 메시지
 */
export const getSystemMessage = (state, data = {}) => {
  const messages = {
    [FSM_STATES.PENDING_ACCEPTANCE]: '대여 요청이 전송되었습니다. 대여해주는 사람의 수락을 기다리고 있습니다.',
    [FSM_STATES.DEPOSIT_PENDING]: `보증금 ${data.deposit?.toLocaleString() || ''}원을 결제해주세요. 보증금은 거래 완료 후 자동 환불됩니다.`,
    [FSM_STATES.RENTAL_FEE_PENDING]: `대여료 ${data.rentalFee?.toLocaleString() || ''}원을 결제해주세요.`,
    [FSM_STATES.AWAITING_OUTBOUND_SHIPPING]: '물건을 포장하여 발송해주세요. 발송 후 송장번호를 입력해주세요.',
    [FSM_STATES.OUTBOUND_SHIPPING_IN_PROGRESS]: `배송 중입니다. 운송장 번호: ${data.trackingNumber || ''}`,
    [FSM_STATES.AWAITING_DELIVERY_CONFIRMATION]: '⚠️ 물건 개봉 영상을 필수로 촬영해주세요. 이는 분쟁 발생 시 중요한 증거 자료입니다.',
    [FSM_STATES.IN_USE]: `대여 기간: ${data.startDate || ''} ~ ${data.endDate || ''}`,
    [FSM_STATES.AWAITING_RETURN_SHIPPING]: '물건을 포장하여 반납해주세요. 발송 후 송장번호를 입력해주세요.',
    [FSM_STATES.RETURN_SHIPPING_IN_PROGRESS]: `반납 배송 중입니다. 운송장 번호: ${data.returnTrackingNumber || ''}`,
    [FSM_STATES.AWAITING_RETURN_CONFIRMATION]: '⚠️ 반납 물건 개봉 영상을 필수로 촬영해주세요. 이는 분쟁 발생 시 중요한 증거 자료입니다.',
    [FSM_STATES.COMPLETED]: `거래가 완료되었습니다. 보증금 ${data.deposit?.toLocaleString() || ''}원이 환불 예정입니다. (3-5 영업일 소요)`,
    [FSM_STATES.DISPUTED]: '분쟁 접수가 완료되었습니다. 관리자가 검토 중입니다. (예상 소요 시간: 3-7 영업일)',
    [FSM_STATES.CANCELLED]: '거래가 취소되었습니다.'
  };

  return messages[state] || '알 수 없는 상태입니다.';
};

/**
 * 상태별 진행률 계산
 * @param {string} state - 현재 상태
 * @returns {number} 진행률 (0-100)
 */
export const getProgressPercentage = (state) => {
  const progressMap = {
    [FSM_STATES.PENDING_ACCEPTANCE]: 5,
    [FSM_STATES.DEPOSIT_PENDING]: 15,
    [FSM_STATES.RENTAL_FEE_PENDING]: 25,
    [FSM_STATES.AWAITING_OUTBOUND_SHIPPING]: 35,
    [FSM_STATES.OUTBOUND_SHIPPING_IN_PROGRESS]: 45,
    [FSM_STATES.AWAITING_DELIVERY_CONFIRMATION]: 55,
    [FSM_STATES.IN_USE]: 70,
    [FSM_STATES.AWAITING_RETURN_SHIPPING]: 80,
    [FSM_STATES.RETURN_SHIPPING_IN_PROGRESS]: 90,
    [FSM_STATES.AWAITING_RETURN_CONFIRMATION]: 95,
    [FSM_STATES.COMPLETED]: 100,
    [FSM_STATES.DISPUTED]: 50,
    [FSM_STATES.CANCELLED]: 0
  };

  return progressMap[state] || 0;
};

/**
 * 타임아웃 시간 가져오기 (시간 단위)
 * @param {string} state - 현재 상태
 * @returns {number} 타임아웃 시간 (시간)
 */
export const getTimeoutHours = (state) => {
  const timeouts = {
    [FSM_STATES.PENDING_ACCEPTANCE]: 24, // 24시간
    [FSM_STATES.DEPOSIT_PENDING]: 24,
    [FSM_STATES.RENTAL_FEE_PENDING]: 24,
    [FSM_STATES.AWAITING_OUTBOUND_SHIPPING]: 72, // 3일
    [FSM_STATES.AWAITING_DELIVERY_CONFIRMATION]: 72,
    [FSM_STATES.AWAITING_RETURN_SHIPPING]: 72,
    [FSM_STATES.AWAITING_RETURN_CONFIRMATION]: 72
  };

  return timeouts[state] || null;
};

/**
 * 상태가 최종 상태인지 확인
 * @param {string} state - 상태
 * @returns {boolean} 최종 상태 여부
 */
export const isFinalState = (state) => {
  return [FSM_STATES.COMPLETED, FSM_STATES.CANCELLED].includes(state);
};

/**
 * 상태가 분쟁 가능한 상태인지 확인
 * @param {string} state - 상태
 * @returns {boolean} 분쟁 가능 여부
 */
export const canDispute = (state) => {
  return ![
    FSM_STATES.PENDING_ACCEPTANCE,
    FSM_STATES.COMPLETED,
    FSM_STATES.CANCELLED,
    FSM_STATES.DISPUTED
  ].includes(state);
};
