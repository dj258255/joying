/**
 * ProductInfo Component
 * 상품 정보 컴포넌트
 */

import React from 'react';
import { FiX } from 'react-icons/fi';

const ProductInfo = ({ title = '', hashtags = [], description = '', compact = false, onRemoveHashtag = null }) => {
  return (
    <div className={compact ? "p-1.5 space-y-1.5" : "glass-card p-4 md:p-6 space-y-4 md:space-y-6"}>
      {/* 상품명 */}
      <h1 className={compact ? "text-base font-bold text-gray-900" : "text-2xl md:text-4xl font-bold text-gray-900 leading-tight"}>
        {title || '상품명'}
      </h1>

      {/* 해시태그 */}
      {hashtags && hashtags.length > 0 && (
        <div className={compact ? "flex flex-wrap gap-1" : "flex flex-wrap gap-2"}>
          {hashtags.map((tag, index) => (
            <span
              key={index}
              className={compact ? "inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium bg-gray-900 text-white" : "px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium glass-button-ghost"}
              style={compact ? {} : {
                background: 'rgba(0, 122, 204, 0.1)',
                color: '#007AFF',
                border: '1px solid rgba(0, 122, 204, 0.2)'
              }}
            >
              #{tag}
              {compact && onRemoveHashtag && (
                <button
                  type="button"
                  onClick={() => onRemoveHashtag(tag)}
                  className="hover:opacity-70 transition-opacity"
                >
                  <FiX className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* 상품 설명 */}
      {compact ? (
        <div>
          <p className="text-[12px] text-gray-700 leading-snug whitespace-pre-wrap line-clamp-3 overflow-hidden">
            {description || '상품 설명이 없습니다.'}
          </p>
        </div>
      ) : (
        <div>
          <p className="text-base md:text-lg text-gray-700 leading-relaxed whitespace-pre-wrap">
            {description || '상품 설명이 없습니다.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default ProductInfo;
