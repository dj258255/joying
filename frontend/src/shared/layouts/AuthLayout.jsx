/**
 * AuthLayout Component
 * 인증 레이아웃 컴포넌트
 */

import React from 'react';

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children - 자식 컴포넌트
 * @param {string} props.className - 추가 CSS 클래스
 */
const AuthLayout = ({ children, className = '' }) => {
  return (
    <div className={`min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 ${className}`}>
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-blue-600">Joying</h1>
          <p className="mt-2 text-sm text-gray-600">
            안전하고 편리한 물품 대여 플랫폼
          </p>
        </div>
      </div>
      
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
