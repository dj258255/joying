/**
 * Date utility functions
 * 날짜 관련 유틸리티 함수들
 */

/**
 * 두 날짜 사이의 일수 계산
 * @param {Date|string} startDate - 시작 날짜
 * @param {Date|string} endDate - 종료 날짜
 * @returns {number} 일수 차이
 */
export const getDaysDifference = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * 날짜가 오늘인지 확인
 * @param {Date|string} date - 확인할 날짜
 * @returns {boolean} 오늘 여부
 */
export const isToday = (date) => {
  const today = new Date();
  const targetDate = new Date(date);
  
  return today.toDateString() === targetDate.toDateString();
};

/**
 * 날짜가 미래인지 확인
 * @param {Date|string} date - 확인할 날짜
 * @returns {boolean} 미래 여부
 */
export const isFuture = (date) => {
  return new Date(date) > new Date();
};

/**
 * 날짜가 과거인지 확인
 * @param {Date|string} date - 확인할 날짜
 * @returns {boolean} 과거 여부
 */
export const isPast = (date) => {
  return new Date(date) < new Date();
};

/**
 * 날짜 범위가 유효한지 확인
 * @param {Date|string} startDate - 시작 날짜
 * @param {Date|string} endDate - 종료 날짜
 * @returns {boolean} 유효성 여부
 */
export const isValidDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return start <= end && start >= new Date();
};

/**
 * 특정 날짜에 요일 추가
 * @param {Date|string} date - 기준 날짜
 * @param {number} days - 추가할 일수
 * @returns {Date} 새로운 날짜
 */
export const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * 날짜 배열에서 중복 제거
 * @param {Array} dates - 날짜 배열
 * @returns {Array} 중복 제거된 날짜 배열
 */
export const removeDuplicateDates = (dates) => {
  const uniqueDates = new Set();
  return dates.filter(date => {
    const dateString = new Date(date).toDateString();
    if (uniqueDates.has(dateString)) {
      return false;
    }
    uniqueDates.add(dateString);
    return true;
  });
};
