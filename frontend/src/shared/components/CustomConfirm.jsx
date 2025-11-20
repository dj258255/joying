/**
 * CustomConfirm Component
 * 커스텀 확인 모달 컴포넌트 (글래스모피즘 디자인)
 */

import React from 'react';

const CustomConfirm = ({ message, onConfirm, onCancel, confirmText = '확인', cancelText = '취소', type = 'warning' }) => {
  const icon = type === 'warning' ? (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  ) : type === 'danger' ? (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>
  ) : (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
  );

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* 배경 오버레이 */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity"
        onClick={onCancel}
      />
      
      {/* 모달 컨테이너 (글래스모피즘) */}
      <div className="relative bg-white/90 backdrop-blur-xl border border-white/40 rounded-3xl shadow-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-4 mb-6">
          <div className="text-gray-900 flex-shrink-0 mt-1">
            {icon}
          </div>
          <div className="flex-1">
            <h3 className="text-gray-900 font-semibold text-lg mb-2">확인</h3>
            <p className="text-gray-700 text-sm leading-relaxed">{message}</p>
          </div>
        </div>
        
        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 bg-white/60 backdrop-blur-sm border border-white/40 text-gray-900 rounded-xl hover:bg-white/80 transition-all duration-200 font-medium shadow-sm"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-5 py-2.5 ${
              type === 'danger' 
                ? 'bg-gray-900 hover:bg-gray-800' 
                : type === 'warning'
                ? 'bg-gray-900 hover:bg-gray-800'
                : 'bg-gray-900 hover:bg-gray-800'
            } text-white rounded-xl transition-all duration-200 font-medium shadow-lg`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomConfirm;

