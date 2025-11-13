/**
 * NavButton Component
 * 하단 네비게이션 바의 개별 버튼 컴포넌트
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';

const NavButton = ({ icon: Icon, label, path, isActive, isCenter = false, badge = null }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(path);
  };

  return (
    <button
      onClick={handleClick}
      className={`
        relative flex flex-col items-center justify-center
        transition-all duration-200
        ${isCenter 
          ? 'w-14 h-14 -mt-6 rounded-full bg-gradient-to-r from-gray-900 to-gray-800 shadow-lg hover:shadow-xl transform hover:scale-105' 
          : 'w-14 h-12 hover:bg-gray-50 rounded-lg'
        }
      `}
      aria-label={label}
    >
      {/* 배지 (읽지 않은 메시지 등) */}
      {badge && badge > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
          {badge > 99 ? '99+' : badge}
        </span>
      )}

      {/* 아이콘 */}
      <Icon 
        className={`
          ${isCenter ? 'w-6 h-6 text-white' : 'w-5 h-5'}
          ${isActive && !isCenter ? 'text-gray-900' : ''}
          ${!isActive && !isCenter ? 'text-gray-400' : ''}
          transition-colors duration-200
        `}
      />

      {/* 라벨 (중앙 버튼은 라벨 없음) */}
      {!isCenter && (
        <span className={`
          text-[10px] mt-1 font-medium
          ${isActive ? 'text-gray-900' : 'text-gray-400'}
          transition-colors duration-200
        `}>
          {label}
        </span>
      )}

      {/* 활성화 인디케이터 (중앙 버튼 제외) */}
      {isActive && !isCenter && (
        <div className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-gray-900 rounded-full" />
      )}
    </button>
  );
};

export default NavButton;

