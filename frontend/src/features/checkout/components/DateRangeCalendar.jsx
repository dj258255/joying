/**
 * DateRangeCalendar Component
 * 날짜 범위 선택 캘린더 컴포넌트
 */

import React, { useState } from 'react';

const DateRangeCalendar = ({ onDateRangeChange, disabledDates = [] }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [selectedRange, setSelectedRange] = useState([]);

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
    if (!date || disabledDates.includes(date.toISOString().split('T')[0])) return;

    // 1단계: 시작일 선택 (처음 클릭)
    if (!startDate && !endDate) {
      setStartDate(date);
      setSelectedRange([date]);
    } 
    // 2단계: 종료일 선택 (두 번째 클릭)
    else if (startDate && !endDate) {
      // 최소 1박 2일 보장: 종료일은 시작일 + 1일 이후여야 함
      const minEndDate = new Date(startDate);
      minEndDate.setDate(startDate.getDate() + 1);
      
      if (date < minEndDate) {
        return; // 시작일과 같은 날짜 또는 시작일 이전 날짜는 선택 불가
      }
      
      // 종료일이 시작일 + 1일 이후인 경우에만 선택
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

  const getDaysInRange = (start, end) => {
    const days = [];
    const current = new Date(start);
    while (current <= end) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
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

  const isDisabled = (date) => {
    if (!date) return false;
    return disabledDates.includes(date.toISOString().split('T')[0]);
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
                    className="p-1.5 md:p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <h4 className="text-base md:text-lg font-semibold text-gray-900">
                    {currentMonth.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}
                  </h4>
                  <button
                    onClick={() => navigateMonth(1)}
                    className="p-1.5 md:p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            const isStart = startDate && date.getTime() === startDate.getTime();
            const isEnd = endDate && date.getTime() === endDate.getTime();
            const isSelected = inRange || isStart || isEnd;

            return (
              <button
                key={index}
                onClick={() => handleDateClick(date)}
                disabled={disabled}
                className={`w-10 h-10 flex items-center justify-center text-sm rounded-lg transition-all duration-200 ${
                  disabled
                    ? 'text-gray-300 cursor-not-allowed'
                    : isSelected
                    ? 'bg-black text-white font-bold'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
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
