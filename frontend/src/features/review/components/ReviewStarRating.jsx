/**
 * ReviewStarRating Component
 * 리뷰 별점 컴포넌트
 */

import React, { useState } from 'react';

/**
 * @param {Object} props
 * @param {number} props.rating - 현재 별점 (0-5, 0.5 단위)
 * @param {Function} props.onRatingChange - 별점 변경 핸들러
 * @param {string} props.size - 크기 (sm, md, lg)
 * @param {boolean} props.readOnly - 읽기 전용 여부
 * @param {boolean} props.allowHalf - 반단위 선택 허용 여부
 */
const ReviewStarRating = ({ 
  rating = 0, 
  onRatingChange, 
  size = 'md', 
  readOnly = false,
  allowHalf = false
}) => {
  const [hoverRating, setHoverRating] = useState(0);
  
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const handleStarClick = (starRating) => {
    if (!readOnly && onRatingChange) {
      onRatingChange(starRating);
    }
  };

  const handleStarHalfClick = (starRating) => {
    if (!readOnly && allowHalf && onRatingChange) {
      onRatingChange(starRating - 0.5);
    }
  };

  const handleMouseEnter = (starRating, isHalf = false) => {
    if (!readOnly) {
      setHoverRating(isHalf ? starRating - 0.5 : starRating);
    }
  };

  const handleMouseLeave = () => {
    if (!readOnly) {
      setHoverRating(0);
    }
  };

  const getFillPercentage = (star) => {
    const currentRating = hoverRating || rating;
    if (currentRating >= star) return 100;
    if (currentRating >= star - 0.5 && allowHalf) return 50;
    return 0;
  };

  return (
    <div className="flex items-center space-x-1" onMouseLeave={handleMouseLeave}>
      {[1, 2, 3, 4, 5].map((star) => {
        const fillPercent = getFillPercentage(star);
        const isFilled = fillPercent === 100;
        const isHalfFilled = fillPercent === 50;
        const isEmpty = fillPercent === 0;

        return (
          <div key={star} className="relative inline-block" style={{ width: sizeClasses[size], height: sizeClasses[size] }}>
            {allowHalf ? (
              <div className="relative w-full h-full">
                {/* 배경 별 (항상 회색) */}
                <svg
                  viewBox="0 0 20 20"
                  className={`${sizeClasses[size]} absolute inset-0`}
                >
                  <path
                    fill="#D1D5DB"
                    d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                  />
                </svg>
                
                {/* 채워진 별 (왼쪽 반쪽 또는 전체) */}
                {(isHalfFilled || isFilled) && (
                  <svg
                    viewBox="0 0 20 20"
                    className={`${sizeClasses[size]} absolute inset-0`}
                    style={{ clipPath: isHalfFilled ? 'polygon(0 0, 50% 0, 50% 100%, 0 100%)' : 'none' }}
                  >
                    <path
                      fill="#FACC15"
                      d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                    />
                  </svg>
                )}
                
                {/* 클릭 영역 */}
                <button
                  type="button"
                  onClick={() => handleStarHalfClick(star)}
                  onMouseEnter={() => handleMouseEnter(star, true)}
                  disabled={readOnly}
                  className={`
                    absolute left-0 top-0 w-1/2 h-full
                    ${!readOnly ? 'cursor-pointer' : 'cursor-default'}
                    z-10
                  `}
                />
                <button
                  type="button"
                  onClick={() => handleStarClick(star)}
                  onMouseEnter={() => handleMouseEnter(star, false)}
                  disabled={readOnly}
                  className={`
                    absolute right-0 top-0 w-1/2 h-full
                    ${!readOnly ? 'cursor-pointer' : 'cursor-default'}
                    z-10
                  `}
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleStarClick(star)}
                onMouseEnter={() => handleMouseEnter(star, false)}
                disabled={readOnly}
                className={`
                  ${sizeClasses[size]}
                  ${!readOnly ? 'cursor-pointer hover:scale-110' : 'cursor-default'}
                  transition-transform duration-150
                `}
              >
                <svg
                  viewBox="0 0 20 20"
                  className={sizeClasses[size]}
                >
                  <path
                    fill={isFilled ? "#FACC15" : "#D1D5DB"}
                    d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                  />
                </svg>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ReviewStarRating;
