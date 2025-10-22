/**
 * UnavailableDateCalendar Component
 * 대여 불가 날짜 캘린더 컴포넌트
 */

import React, { useState } from 'react';

/**
 * @param {Object} props
 * @param {Array} props.unavailableDates - 대여 불가 날짜 배열
 * @param {Function} props.onDateChange - 날짜 변경 핸들러
 * @param {boolean} props.disabled - 비활성화 여부
 */
const UnavailableDateCalendar = ({ 
  unavailableDates = [], 
  onDateChange, 
  disabled = false 
}) => {
  const [selectedDates, setSelectedDates] = useState(unavailableDates);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const handleDateClick = (date) => {
    if (disabled) return;

    const dateString = date.toISOString().split('T')[0];
    const isSelected = selectedDates.includes(dateString);
    
    let newSelectedDates;
    if (isSelected) {
      newSelectedDates = selectedDates.filter(d => d !== dateString);
    } else {
      newSelectedDates = [...selectedDates, dateString];
    }
    
    setSelectedDates(newSelectedDates);
    onDateChange?.(newSelectedDates);
  };

  const generateCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const calendar = [];
    const currentDate = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      calendar.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return calendar;
  };

  const isDateUnavailable = (date) => {
    const dateString = date.toISOString().split('T')[0];
    return selectedDates.includes(dateString);
  };

  const isCurrentMonth = (date) => {
    return date.getMonth() === currentMonth.getMonth();
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setMonth(newMonth.getMonth() + direction);
      return newMonth;
    });
  };

  const calendar = generateCalendar();
  const monthNames = [
    '1월', '2월', '3월', '4월', '5월', '6월',
    '7월', '8월', '9월', '10월', '11월', '12월'
  ];

  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigateMonth(-1)}
          disabled={disabled}
          className="p-2 hover:bg-gray-100 rounded disabled:opacity-50"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <h3 className="text-lg font-semibold">
          {currentMonth.getFullYear()}년 {monthNames[currentMonth.getMonth()]}
        </h3>
        
        <button
          onClick={() => navigateMonth(1)}
          disabled={disabled}
          className="p-2 hover:bg-gray-100 rounded disabled:opacity-50"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {['일', '월', '화', '수', '목', '금', '토'].map(day => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {calendar.map((date, index) => {
          const isUnavailable = isDateUnavailable(date);
          const isCurrentMonthDate = isCurrentMonth(date);
          const isTodayDate = isToday(date);
          
          return (
            <button
              key={index}
              onClick={() => handleDateClick(date)}
              disabled={disabled}
              className={`
                h-8 w-8 text-sm rounded-full transition-colors
                ${isCurrentMonthDate ? 'text-gray-900' : 'text-gray-400'}
                ${isTodayDate ? 'bg-blue-100 text-blue-600' : ''}
                ${isUnavailable ? 'bg-red-100 text-red-600' : 'hover:bg-gray-100'}
                ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
              `}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center space-x-4 text-sm">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-red-100 rounded mr-2"></div>
          <span className="text-gray-600">대여 불가</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-blue-100 rounded mr-2"></div>
          <span className="text-gray-600">오늘</span>
        </div>
      </div>
    </div>
  );
};

export default UnavailableDateCalendar;
