/**
 * DateRangeCalendar Component
 * 날짜 범위 선택 캘린더 컴포넌트
 */

import React, { useState, useEffect } from 'react';

const DateRangeCalendar = ({ 
  onDateRangeChange, 
  disabledDates = [], 
  bookedDates = [],
  availableStartDate = null, 
  availableEndDate = null,
  initialStartDate = null,
  initialEndDate = null,
  readOnly = false
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [selectedRange, setSelectedRange] = useState([]);

  // 날짜 범위 내의 모든 날짜 배열 생성
  const getDaysInRange = (start, end) => {
    const days = [];
    const current = new Date(start);
    while (current <= end) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  };

  // 초기값 설정
  useEffect(() => {
    if (initialStartDate && initialEndDate) {
      const start = initialStartDate instanceof Date 
        ? initialStartDate 
        : new Date(initialStartDate);
      const end = initialEndDate instanceof Date 
        ? initialEndDate 
        : new Date(initialEndDate);
      
      // 날짜 정규화 (시간 제거)
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      
      setStartDate(start);
      setEndDate(end);
      
      const range = getDaysInRange(start, end);
      setSelectedRange(range);
      
      // 초기 달을 시작일이 포함된 달로 설정
      setCurrentMonth(new Date(start));
      
      // 부모 컴포넌트에 알림
      if (onDateRangeChange) {
        onDateRangeChange({
          start: start,
          end: end
        });
      }
    }
  }, [initialStartDate, initialEndDate, onDateRangeChange]);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    return days;
  };

  const handleDateClick = (date) => {
    if (!date || isDisabled(date) || readOnly) return;

    // 1단계: 시작일 선택 (처음 클릭)
    if (!startDate && !endDate) {
      setStartDate(date);
      setSelectedRange([date]);
    } 
    // 2단계: 종료일 선택 (두 번째 클릭)
    else if (startDate && !endDate) {
      // 종료일은 시작일과 같거나 이후여야 함 (당일 대여 허용)
      if (date < startDate) {
        return; // 시작일 이전 날짜는 선택 불가
      }
      
      // 선택한 기간 내에 대여 불가 날짜가 있는지 확인
      if (hasDisabledDateInRange(startDate, date)) {
        alert('선택한 기간에 대여 불가능한 날짜가 포함되어 있습니다.\n다른 날짜를 선택해주세요.');
        // 시작일 초기화
        setStartDate(null);
        setSelectedRange([]);
        return;
      }

      // 종료일 설정 (당일 대여 가능)
      setEndDate(date);
      const range = getDaysInRange(startDate, date);
      setSelectedRange(range);
      if (onDateRangeChange) {
        onDateRangeChange({
          start: startDate,
          end: date
        });
      }
    }
    // 3단계: 범위가 완성된 후 추가 클릭 시 완전히 초기화만
    else if (startDate && endDate) {
      setStartDate(null);
      setEndDate(null);
      setSelectedRange([]);
      if (onDateRangeChange) {
        onDateRangeChange(null);
      }
    }
  };

  const navigateMonth = (direction) => {
    setCurrentMonth((prev) => {
      const newMonth = new Date(prev);
      newMonth.setMonth(prev.getMonth() + direction);
      return newMonth;
    });
  };

  const isDateInRange = (date) => {
    if (!date || !startDate || !endDate) return false;
    return date >= startDate && date <= endDate;
  };

  // 오늘 이전 날짜 체크 (빨간색)
  const isPastDate = (date) => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  };

  // 대여 불가 날짜 체크 (불가 기간)
  const isDisabledByRentalRefuse = (date) => {
    if (!date) return false;
    const dateStr = date.toISOString().split('T')[0];
    return disabledDates.includes(dateStr);
  };

  // 다른 사람이 대여한 날짜 체크
  const isBookedDate = (date) => {
    if (!date) return false;
    const dateStr = date.toISOString().split('T')[0];
    return bookedDates.includes(dateStr);
  };

  // 대여 가능 기간 외의 날짜 체크 (회색)
  const isOutOfRange = (date) => {
    if (!date) return false;
    
    if (availableStartDate) {
      const startDate = new Date(availableStartDate);
      startDate.setHours(0, 0, 0, 0);
      if (date < startDate) {
        return true;
      }
    }
    
    if (availableEndDate) {
      const endDate = new Date(availableEndDate);
      endDate.setHours(23, 59, 59, 999);
      if (date > endDate) {
        return true;
      }
    }
    
    return false;
  };

  // 전체 disabled 여부 (선택 불가)
  const isDisabled = (date) => {
    return isPastDate(date) || isDisabledByRentalRefuse(date) || isBookedDate(date) || isOutOfRange(date) || readOnly;
  };

  // 선택한 기간 내에 대여 불가 날짜가 있는지 확인
  const hasDisabledDateInRange = (start, end) => {
    if (!start || !end) return false;
    const current = new Date(start);
    while (current <= end) {
      if (isDisabled(current)) {
        return true;
      }
      current.setDate(current.getDate() + 1);
    }
    return false;
  };

  const formatDateRange = () => {
    if (!startDate) return '';
    if (!endDate) {
      return startDate.toLocaleDateString('ko-KR').replace(/\./g, '.').slice(0, -1);
    }
    const startStr = startDate.toLocaleDateString('ko-KR').replace(/\./g, '.').slice(0, -1);
    const endStr = endDate.toLocaleDateString('ko-KR').replace(/\./g, '.').slice(0, -1);
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    return `${startStr} ~ ${endStr} (${daysDiff}일)`;
  };

  const days = getDaysInMonth(currentMonth);

  return (
    <div className="space-y-3 md:space-y-4">
      {/* 캘린더 */}
      <div className="glass-card p-3 md:p-4">
                        <div className="flex items-center justify-between mb-3 md:mb-4">
                  <button
                    onClick={() => navigateMonth(-1)}
                    className="p-1.5 md:p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-900 bg-transparent"
                    style={{ color: '#111827' }}
                  >
                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ stroke: '#111827' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <h4 className="text-base md:text-lg font-semibold text-gray-900">
                    {currentMonth.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}
                  </h4>
                  <button
                    onClick={() => navigateMonth(1)}
                    className="p-1.5 md:p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-900 bg-transparent"
                    style={{ color: '#111827' }}
                  >
                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ stroke: '#111827' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
            <div key={day} className="text-center text-xs font-medium text-gray-600 py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((date, index) => {
            if (!date) return <div key={index} className="w-10 h-10" />;

            const inRange = isDateInRange(date);
            const disabled = isDisabled(date);
            const past = isPastDate(date); // 오늘 이전 날짜
            const isRefused = isDisabledByRentalRefuse(date); // 불가 기간
            const isBooked = isBookedDate(date); // 다른 사람이 대여한 날짜
            const outOfRange = isOutOfRange(date); // 대여 기간 외
            const isStart = startDate && date.getTime() === startDate.getTime();
            const isEnd = endDate && date.getTime() === endDate.getTime();
            const isSelected = inRange || isStart || isEnd;

            let buttonStyle = '';
            if (isSelected) {
              // 선택된 날짜: 검정 배경 + 흰 글씨
              buttonStyle = 'bg-black text-white font-bold';
            } else if (isRefused || isBooked) {
              // 불가 기간 또는 다른 사람이 대여한 날짜: 투명한 붉은 색 배경
              buttonStyle = 'bg-red-500/30 text-red-900 font-medium cursor-not-allowed';
            } else if (past || outOfRange) {
              // 과거 날짜 또는 대여 기간 외: 회색 배경 + 회색 글씨
              buttonStyle = 'bg-gray-200 text-gray-400 cursor-not-allowed';
            } else {
              // 일반 날짜
              buttonStyle = readOnly ? 'text-gray-700' : 'text-gray-700 hover:bg-gray-100';
            }

            return (
              <button
                key={index}
                onClick={() => handleDateClick(date)}
                disabled={disabled}
                className={`w-10 h-10 flex items-center justify-center text-sm rounded-lg transition-all duration-200 ${buttonStyle}`}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </div>

      {/* 선택된 날짜 범위 */}
      {formatDateRange() && (
        <div className="text-center text-base md:text-lg font-bold text-black py-2">
          {formatDateRange()}
        </div>
      )}
    </div>
  );
};

export default DateRangeCalendar;
