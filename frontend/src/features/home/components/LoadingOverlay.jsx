/**
 * LoadingOverlay Component
 * Three.js 로딩 중 표시되는 오버레이
 */

import React from 'react';

const LoadingOverlay = () => {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
        <p className="text-primary-600 font-medium">3D 씬을 로딩 중...</p>
      </div>
    </div>
  );
};

export default LoadingOverlay;
