/**
 * ReviewStarRating Component
 * 리뷰 별점 컴포넌트 - 상품 목록 페이지 필터와 동일한 로직 사용
 */

import React from 'react';

/**
 * @param {Object} props
 * @param {number} props.rating - 현재 별점 (0-5, 0.5 단위)
 * @param {Function} props.onRatingChange - 별점 변경 핸들러
 * @param {string} props.size - 크기 (sm, md, lg)
 * @param {boolean} props.readOnly - 읽기 전용 여부
 * @param {boolean} props.allowHalf - 반단위 선택 허용 여부 (기본값: true)
 */
const ReviewStarRating = ({ 
  rating = 0, 
  onRatingChange, 
  size = 'md', 
  readOnly = false,
  allowHalf = true
}) => {
  const sizeMap = {
    sm: { width: '16px', height: '16px', viewBox: '0 0 24 24' },
    md: { width: '24px', height: '24px', viewBox: '0 0 24 24' },
    lg: { width: '32px', height: '32px', viewBox: '0 0 24 24' }
  };

  const sizeConfig = sizeMap[size] || sizeMap.md;

  // 상품 목록 페이지와 동일한 클릭 핸들러
  const handleStarClick = (e, starIndex) => {
    if (readOnly || !onRatingChange) return;
    
    if (allowHalf) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const isLeftHalf = clickX < rect.width / 2;
      const newRating = isLeftHalf ? starIndex - 0.5 : starIndex;
      onRatingChange(newRating);
    } else {
      onRatingChange(starIndex);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3, 4, 5].map((star) => {
        const isFull = rating >= star;
        const isHalf = rating === star - 0.5;
        
        return (
          <button
            key={star}
            type="button"
            onClick={(e) => handleStarClick(e, star)}
            disabled={readOnly}
            className={`relative transition-transform duration-200 ${!readOnly ? 'hover:scale-110 cursor-pointer' : 'cursor-default'}`}
            style={{ width: sizeConfig.width, height: sizeConfig.height }}
          >
            <svg
              width={sizeConfig.width}
              height={sizeConfig.height}
              viewBox={sizeConfig.viewBox}
              className="absolute left-0 top-0"
            >
              <defs>
                <linearGradient id={`review-gradient-${star}`} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="50%" stopColor={isHalf || isFull ? '#FFD700' : '#E5E7EB'} />
                  <stop offset="50%" stopColor={isFull ? '#FFD700' : '#E5E7EB'} />
                </linearGradient>
              </defs>
              <path 
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" 
                fill={isHalf ? `url(#review-gradient-${star})` : isFull ? '#FFD700' : '#E5E7EB'}
                style={{
                  filter: isFull || isHalf ? 'drop-shadow(0 2px 4px rgba(255, 215, 0, 0.4))' : 'none',
                  transition: 'all 0.2s'
                }}
              />
            </svg>
          </button>
        );
      })}
    </div>
  );
};

export default ReviewStarRating;
