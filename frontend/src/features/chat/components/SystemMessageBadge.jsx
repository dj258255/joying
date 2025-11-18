/**
 * SystemMessageBadge Component
 * 시스템 메시지 배지 컴포넌트
 */

import React from 'react';

/**
 * @param {Object} props
 * @param {string} props.message - 시스템 메시지
 * @param {string} props.type - 메시지 타입 (info, warning, error, success)
 */
const SystemMessageBadge = ({ message, type = 'info' }) => {
  const typeStyles = {
    info: 'bg-white/80 backdrop-blur-xl border-gray-200/60 text-gray-900',
    warning: 'bg-yellow-500/20 backdrop-blur-xl border-yellow-400/50 text-yellow-900',
    error: 'bg-red-500/20 backdrop-blur-xl border-red-400/50 text-red-900',
    success: 'bg-green-500/20 backdrop-blur-xl border-green-400/50 text-green-900'
  };

  const typeIcons = {
    info: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    warning: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    error: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    success: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    )
  };

  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border shadow-md ${typeStyles[type]}`}>
      {typeIcons[type]}
      <span>{message}</span>
    </div>
  );
};

export default SystemMessageBadge;
