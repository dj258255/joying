/**
 * Transaction Utility Functions
 * 거래 관련 유틸리티 함수들
 */

/**
 * 대여 기간 계산 (일수)
 * @param {Date|string} startDate - 시작 날짜
 * @param {Date|string} endDate - 종료 날짜
 * @returns {number} 대여 일수
 */
export const calculateRentalDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
};

/**
 * 총 결제 금액 계산
 * @param {number} dailyPrice - 일일 대여료
 * @param {number} days - 대여 일수
 * @param {number} deposit - 보증금
 * @returns {number} 총 결제 금액
 */
export const calculateTotalAmount = (dailyPrice, days, deposit) => {
  return (dailyPrice * days) + deposit;
};

/**
 * 거래 상태에 따른 버튼 텍스트 및 색상 반환
 * @param {string} status - 거래 상태
 * @param {boolean} isSeller - 판매자 여부
 * @returns {{text: string, color: string}}
 */
export const getTransactionButtonStyle = (status, isSeller) => {
  const defaultStyle = {
    text: isSeller ? '거래 생성하기' : '거래 시작하기',
    color: 'bg-blue-600 hover:bg-blue-700'
  };

  if (!status) return defaultStyle;

  const statusMap = {
    'PAYMENT_PENDING': {
      text: isSeller ? '결제 대기 중' : '결제하러 가기',
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    'PAYMENT_COMPLETED': {
      text: isSeller ? '발송 처리' : '배송 추적',
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    'SHIPPED': {
      text: isSeller ? '배송 중' : '배송 추적',
      color: 'bg-green-600 hover:bg-green-700'
    },
    'DELIVERED': {
      text: isSeller ? '수령 대기' : '수령 확인',
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    'RENTING': {
      text: '대여 중',
      color: 'bg-purple-600 hover:bg-purple-700'
    },
    'RETURN_REQUESTED': {
      text: isSeller ? '반납 확인' : '반납 추적',
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    'RETURN_SHIPPED': {
      text: isSeller ? '반납 확인' : '반납 추적',
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    'COMPLETED': {
      text: '거래 완료',
      color: 'bg-gray-600 hover:bg-gray-700'
    }
  };

  return statusMap[status] || defaultStyle;
};

/**
 * 비디오 타입 결정
 * @param {string} step - 현재 단계
 * @param {boolean} isSeller - 판매자 여부
 * @returns {string} 비디오 타입
 */
export const getVideoType = (step, isSeller) => {
  if (step === 'shipping') {
    return 'OWNER_SEND';
  } else if (step === 'receive') {
    return 'RENTER_RECEIVE';
  } else if (step === 'return') {
    return isSeller ? 'OWNER_RECEIVE' : 'RENTER_RETURN';
  }
  return 'OWNER_SEND';
};

/**
 * 모달 제목 반환
 * @param {string} step - 현재 단계
 * @returns {string} 모달 제목
 */
export const getModalTitle = (step) => {
  const titles = {
    'create': '거래 생성하기',
    'payment_waiting': '결제 대기 중',
    'payment': '결제하기',
    'shipping': '발송 처리',
    'delivery': '배송 추적',
    'receive': '수령 확인',
    'rental': '대여 중',
    'return': '반납 처리',
    'complete': '거래 완료',
    'cancelled': '거래 취소됨',
    'cancel': '거래 취소'
  };

  return titles[step] || '거래 프로세스';
};
