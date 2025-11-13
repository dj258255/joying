/**
 * ErrorAlert Component
 * 에러 메시지 표시 컴포넌트
 */

import React from 'react';

const ErrorAlert = ({ message }) => {
  if (!message) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <p className="text-sm text-red-600">{message}</p>
    </div>
  );
};

export default ErrorAlert;
