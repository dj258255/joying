/**
 * DefaultAvatar Component
 * 기본 프로필 이미지 컴포넌트
 */

import React from 'react';

const DefaultAvatar = ({ size = 40, className = '', onClick }) => {
  return (
    <div 
      className={`bg-gray-300 rounded-full flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      onClick={onClick}
    >
      <svg 
        width={size * 0.6} 
        height={size * 0.6} 
        fill="currentColor" 
        viewBox="0 0 24 24"
        className="text-gray-600"
      >
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
      </svg>
    </div>
  );
};

export default DefaultAvatar;
