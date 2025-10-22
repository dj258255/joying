/**
 * Formatting utility functions
 * 포맷팅 유틸리티 함수들
 */

/**
 * 숫자를 한국 원화 형식으로 포맷
 * @param {number} amount - 포맷할 금액
 * @returns {string} 포맷된 금액 문자열
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW'
  }).format(amount);
};

/**
 * 날짜를 한국 형식으로 포맷
 * @param {Date|string} date - 포맷할 날짜
 * @param {Object} options - 포맷 옵션
 * @returns {string} 포맷된 날짜 문자열
 */
export const formatDate = (date, options = {}) => {
  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  
  return new Intl.DateTimeFormat('ko-KR', { ...defaultOptions, ...options }).format(new Date(date));
};

/**
 * 상대 시간 포맷 (예: 3시간 전)
 * @param {Date|string} date - 포맷할 날짜
 * @returns {string} 포맷된 상대 시간 문자열
 */
export const formatRelativeTime = (date) => {
  const now = new Date();
  const targetDate = new Date(date);
  const diffInSeconds = Math.floor((now - targetDate) / 1000);

  if (diffInSeconds < 60) {
    return '방금 전';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}분 전`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}시간 전`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}일 전`;
  } else {
    return formatDate(date);
  }
};

/**
 * 파일 크기를 읽기 쉬운 형식으로 포맷
 * @param {number} bytes - 바이트 크기
 * @returns {string} 포맷된 파일 크기
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * 전화번호를 하이픈 포함 형식으로 포맷
 * @param {string} phone - 전화번호
 * @returns {string} 포맷된 전화번호
 */
export const formatPhoneNumber = (phone) => {
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{4})(\d{4})$/);
  
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  
  return phone;
};
