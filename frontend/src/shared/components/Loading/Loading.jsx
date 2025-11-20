/**
 * Loading Component
 * 로딩 스피너 컴포넌트
 */

import React from 'react';

/**
 * @param {Object} props
 * @param {string} props.size - 로딩 스피너 크기 (sm, md, lg)
 * @param {string} props.text - 로딩 텍스트
 * @param {string} props.className - 추가 CSS 클래스
 */
const Loading = ({
  size = 'md',
  text = '로딩 중...',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-500 ${sizeClasses[size]}`} />
      {text && (
        <p className="mt-2 text-sm text-gray-600">{text}</p>
      )}
    </div>
  );
};

export default Loading;
