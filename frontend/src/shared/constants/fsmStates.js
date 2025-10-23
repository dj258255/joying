/**
 * FSM 상태 상수 정의
 * 11단계 거래 프로세스의 모든 상태
 */

export const FSM_STATES = {
  // 1단계: 수락 대기
  PENDING_ACCEPTANCE: 'PENDING_ACCEPTANCE',
  
  // 2단계: 보증금 결제 대기
  DEPOSIT_PENDING: 'DEPOSIT_PENDING',
  
  // 3단계: 대여료 결제 대기
  RENTAL_FEE_PENDING: 'RENTAL_FEE_PENDING',
  
  // 4단계: 발송 대기
  AWAITING_OUTBOUND_SHIPPING: 'AWAITING_OUTBOUND_SHIPPING',
  
  // 5단계: 발송 배송 중
  OUTBOUND_SHIPPING_IN_PROGRESS: 'OUTBOUND_SHIPPING_IN_PROGRESS',
  
  // 6단계: 수령 확인 대기
  AWAITING_DELIVERY_CONFIRMATION: 'AWAITING_DELIVERY_CONFIRMATION',
  
  // 7단계: 사용 중
  IN_USE: 'IN_USE',
  
  // 8단계: 반납 발송 대기
  AWAITING_RETURN_SHIPPING: 'AWAITING_RETURN_SHIPPING',
  
  // 9단계: 반납 배송 중
  RETURN_SHIPPING_IN_PROGRESS: 'RETURN_SHIPPING_IN_PROGRESS',
  
  // 10단계: 반납 확인 대기
  AWAITING_RETURN_CONFIRMATION: 'AWAITING_RETURN_CONFIRMATION',
  
  // 11단계: 거래 완료
  COMPLETED: 'COMPLETED',
  
  // 특수 상태
  CANCELLED: 'CANCELLED',
  DISPUTED: 'DISPUTED'
};

/**
 * 상태별 한국어 라벨
 */
export const FSM_STATE_LABELS = {
  [FSM_STATES.PENDING_ACCEPTANCE]: '수락 대기',
  [FSM_STATES.DEPOSIT_PENDING]: '보증금 결제 대기',
  [FSM_STATES.RENTAL_FEE_PENDING]: '대여료 결제 대기',
  [FSM_STATES.AWAITING_OUTBOUND_SHIPPING]: '발송 대기',
  [FSM_STATES.OUTBOUND_SHIPPING_IN_PROGRESS]: '발송 배송 중',
  [FSM_STATES.AWAITING_DELIVERY_CONFIRMATION]: '수령 확인 대기',
  [FSM_STATES.IN_USE]: '사용 중',
  [FSM_STATES.AWAITING_RETURN_SHIPPING]: '반납 발송 대기',
  [FSM_STATES.RETURN_SHIPPING_IN_PROGRESS]: '반납 배송 중',
  [FSM_STATES.AWAITING_RETURN_CONFIRMATION]: '반납 확인 대기',
  [FSM_STATES.COMPLETED]: '거래 완료',
  [FSM_STATES.CANCELLED]: '거래 취소',
  [FSM_STATES.DISPUTED]: '분쟁 중'
};

/**
 * 상태별 색상 (Tailwind CSS 클래스)
 */
export const FSM_STATE_COLORS = {
  [FSM_STATES.PENDING_ACCEPTANCE]: 'bg-yellow-100 text-yellow-800',
  [FSM_STATES.DEPOSIT_PENDING]: 'bg-orange-100 text-orange-800',
  [FSM_STATES.RENTAL_FEE_PENDING]: 'bg-orange-100 text-orange-800',
  [FSM_STATES.AWAITING_OUTBOUND_SHIPPING]: 'bg-blue-100 text-blue-800',
  [FSM_STATES.OUTBOUND_SHIPPING_IN_PROGRESS]: 'bg-blue-100 text-blue-800',
  [FSM_STATES.AWAITING_DELIVERY_CONFIRMATION]: 'bg-purple-100 text-purple-800',
  [FSM_STATES.IN_USE]: 'bg-green-100 text-green-800',
  [FSM_STATES.AWAITING_RETURN_SHIPPING]: 'bg-indigo-100 text-indigo-800',
  [FSM_STATES.RETURN_SHIPPING_IN_PROGRESS]: 'bg-indigo-100 text-indigo-800',
  [FSM_STATES.AWAITING_RETURN_CONFIRMATION]: 'bg-purple-100 text-purple-800',
  [FSM_STATES.COMPLETED]: 'bg-green-100 text-green-800',
  [FSM_STATES.CANCELLED]: 'bg-gray-100 text-gray-800',
  [FSM_STATES.DISPUTED]: 'bg-red-100 text-red-800'
};

/**
 * 액션별 한국어 라벨
 */
export const FSM_ACTION_LABELS = {
  accept: '수락하기',
  reject: '거절하기',
  cancel: '취소하기',
  payDeposit: '보증금 결제',
  payRentalFee: '대여료 결제',
  inputTracking: '송장번호 입력',
  confirmDelivery: '수령 확인',
  recordVideo: '개봉 영상 촬영',
  requestExtend: '연장 신청',
  approveExtend: '연장 승인',
  rejectExtend: '연장 거절',
  requestEarlyReturn: '조기 종료 신청',
  approveEarlyReturn: '조기 종료 승인',
  inputReturnTracking: '반납 송장번호 입력',
  confirmReturn: '반납 확인',
  confirmReturnNormal: '정상 반납 확인',
  confirmReturnDamaged: '손상 신고',
  reportDamage: '손상 신고',
  writeReview: '리뷰 작성',
  submitEvidence: '증거 제출',
  resolved: '분쟁 해결'
};
