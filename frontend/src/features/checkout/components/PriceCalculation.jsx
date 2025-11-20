/**
 * PriceCalculation Component
 * 가격 계산 컴포넌트
 */

import React from 'react';

const PriceCalculation = ({ pricePerDay = 0, deposit = 0, days = 0 }) => {
  const subtotal = pricePerDay * days;
  const total = subtotal + deposit;

  const formatPrice = (amount) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  // 날짜가 선택되지 않았을 때 초기화된 상태 표시
  if (days === 0) {
    return (
      <div className="glass-card p-4 md:p-6 space-y-3 md:space-y-4">
        <h3 className="text-base md:text-lg font-bold text-gray-900">예상 금액</h3>
        
        {/* 1일당 대여료 */}
        <div className="flex justify-between items-center">
          <span className="text-sm md:text-base text-gray-600">1일당 대여료</span>
          <span className="font-semibold text-gray-900 truncate ml-4 text-sm md:text-base">
            {formatPrice(pricePerDay)}원
          </span>
        </div>

        {/* 대여 일수 */}
        <div className="flex justify-between items-center">
          <span className="text-sm md:text-base text-gray-600">대여 일수</span>
          <span className="font-semibold text-gray-500 text-sm md:text-base">
            날짜를 선택해주세요
          </span>
        </div>

        {/* 소계 */}
        <div className="flex justify-between items-center pt-2 md:pt-3 border-t border-gray-200">
          <span className="text-sm md:text-base text-gray-700">소계</span>
          <span className="font-semibold text-gray-500 truncate ml-4 text-sm md:text-base">
            -
          </span>
        </div>

        {/* 보증금 */}
        <div className="flex justify-between items-center">
          <span className="text-sm md:text-base text-gray-600">보증금</span>
          <span className="font-semibold text-gray-900 truncate ml-4 text-sm md:text-base">
            {formatPrice(deposit)}원
          </span>
        </div>

        {/* 총 금액 */}
        <div className="flex justify-between items-center pt-3 md:pt-4 border-t-2 border-gray-300">
          <span className="text-base md:text-lg font-bold text-gray-900">총 금액</span>
          <span 
            className="text-xl md:text-2xl font-extrabold truncate ml-4"
            style={{ color: '#9CA3AF' }}
          >
            -
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-4 md:p-6 space-y-3 md:space-y-4">
      <h3 className="text-base md:text-lg font-bold text-gray-900">예상 금액</h3>
      
      {/* 1일당 대여료 */}
      <div className="flex justify-between items-center">
        <span className="text-sm md:text-base text-gray-600">1일당 대여료</span>
        <span className="font-semibold text-gray-900 truncate ml-4 text-sm md:text-base">
          {formatPrice(pricePerDay)}원
        </span>
      </div>

      {/* 대여 일수 */}
      <div className="flex justify-between items-center">
        <span className="text-sm md:text-base text-gray-600">대여 일수</span>
        <span className="font-semibold text-gray-900 text-sm md:text-base">
          {days}일
        </span>
      </div>

      {/* 소계 */}
      <div className="flex justify-between items-center pt-2 md:pt-3 border-t border-gray-200">
        <span className="text-sm md:text-base text-gray-700">소계</span>
        <span className="font-semibold text-gray-900 truncate ml-4 text-sm md:text-base">
          {formatPrice(subtotal)}원
        </span>
      </div>

      {/* 보증금 */}
      <div className="flex justify-between items-center">
        <span className="text-sm md:text-base text-gray-600">보증금</span>
        <span className="font-semibold text-gray-900 truncate ml-4 text-sm md:text-base">
          {formatPrice(deposit)}원
        </span>
      </div>

      {/* 총 금액 */}
      <div className="flex justify-between items-center pt-3 md:pt-4 border-t-2 border-gray-300">
        <span className="text-base md:text-lg font-bold text-gray-900">총 금액</span>
        <span 
          className="text-xl md:text-2xl font-extrabold truncate ml-4"
          style={{ color: '#007AFF' }}
        >
          {formatPrice(total)}원
        </span>
      </div>
    </div>
  );
};

export default PriceCalculation;
