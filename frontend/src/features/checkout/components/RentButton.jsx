/**
 * RentButton Component
 * 대여 요청 버튼 컴포넌트 - 새로운 디자인
 */

import React from 'react';

const RentButton = ({ isEnabled = false, onClick }) => {
  const handleClick = () => {
    if (isEnabled && onClick) {
      onClick();
    } else {
      alert('날짜를 선택해주세요.');
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={!isEnabled}
      className={`w-full py-4 px-6 rounded-2xl text-lg font-bold transition-all duration-300 transform ${
        isEnabled
          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] hover:from-blue-700 hover:to-blue-800 cursor-pointer'
          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
      }`}
      style={{
        background: isEnabled 
          ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
          : '#e5e7eb',
        boxShadow: isEnabled 
          ? '0 10px 25px rgba(37, 99, 235, 0.3), 0 0 0 1px rgba(37, 99, 235, 0.1)'
          : '0 2px 4px rgba(0, 0, 0, 0.1)'
      }}
    >
      <div className="flex items-center justify-center gap-2">
        <svg 
          className="w-5 h-5" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 6v6m0 0v6m0-6h6m-6 0H6" 
          />
        </svg>
        <span>빌려주세요</span>
      </div>
    </button>
  );
};

export default RentButton;   