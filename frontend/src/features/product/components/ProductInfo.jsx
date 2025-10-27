/**
 * ProductInfo Component
 * 상품 정보 컴포넌트
 */

import React from 'react';

const ProductInfo = ({ title = '', hashtags = [], description = '' }) => {
  return (
    <div className="glass-card p-4 md:p-6 space-y-4 md:space-y-6">
      {/* 상품명 */}
      <h1 className="text-2xl md:text-4xl font-bold text-gray-900 leading-tight">
        {title || '상품명'}
      </h1>

      {/* 해시태그 */}
      {hashtags && hashtags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {hashtags.map((tag, index) => (
            <span
              key={index}
              className="px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium glass-button-ghost"
              style={{
                background: 'rgba(0, 122, 204, 0.1)',
                color: '#007AFF',
                border: '1px solid rgba(0, 122, 204, 0.2)'
              }}
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* 상품 설명 */}
      <div>
        <p className="text-base md:text-lg text-gray-700 leading-relaxed whitespace-pre-wrap">
          {description || '상품 설명이 없습니다.'}
        </p>
      </div>
    </div>
  );
};

export default ProductInfo;
