/**
 * CustomConfirm Component
 * 커스텀 확인 모달 컴포넌트
 */

import React from 'react';

const CustomConfirm = ({ message, onConfirm, onCancel, confirmText = '확인', cancelText = '취소', type = 'warning' }) => {
  const bgColor = type === 'warning'
    ? 'bg-yellow-50 border-yellow-200'
    : type === 'danger'
    ? 'bg-red-50 border-red-200'
    : 'bg-blue-50 border-blue-200';

  const textColor = type === 'warning'
    ? 'text-yellow-800'
    : type === 'danger'
    ? 'text-red-800'
    : 'text-blue-800';

  const iconColor = type === 'warning'
    ? 'text-yellow-600'
    : type === 'danger'
    ? 'text-red-600'
    : 'text-blue-600';

  const buttonBg = type === 'warning'
    ? 'bg-yellow-600 hover:bg-yellow-700'
    : type === 'danger'
    ? 'bg-red-600 hover:bg-red-700'
    : 'bg-blue-600 hover:bg-blue-700';

  const icon = type === 'warning' ? (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  ) : (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>
  );

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* 배경 오버레이 */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      
      {/* 모달 컨테이너 */}
      <div className={`relative ${bgColor} border-2 rounded-2xl shadow-2xl p-6 max-w-md w-full backdrop-blur-sm`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-4 mb-4">
          <div className={`${iconColor} flex-shrink-0 mt-1`}>
            {icon}
          </div>
          <div className="flex-1">
            <h3 className={`${textColor} font-semibold text-lg mb-2`}>확인</h3>
            <p className={`${textColor} text-sm leading-relaxed`}>{message}</p>
          </div>
        </div>
        
        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 ${buttonBg} text-white rounded-lg transition-colors font-medium`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomConfirm;

