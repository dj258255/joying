/**
 * ReviewStarRating Component
 * 리뷰 별점 컴포넌트
 */

import React from 'react';

/**
 * @param {Object} props
 * @param {number} props.rating - 현재 별점 (0-5)
 * @param {Function} props.onRatingChange - 별점 변경 핸들러
 * @param {string} props.size - 크기 (sm, md, lg)
 * @param {boolean} props.readOnly - 읽기 전용 여부
 */
const ReviewStarRating = ({ 
  rating = 0, 
  onRatingChange, 
  size = 'md', 
  readOnly = false 
}) => {
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

  const handleMouseEnter = (starRating) => {
    if (!readOnly) {
      // TODO: 호버 효과 구현
    }
  };

  return (
    <div className="flex items-center space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => handleStarClick(star)}
          onMouseEnter={() => handleMouseEnter(star)}
          disabled={readOnly}
          className={`
            ${sizeClasses[size]}
            ${!readOnly ? 'cursor-pointer hover:scale-110' : 'cursor-default'}
            transition-transform duration-150
          `}
        >
          <svg
            key={star}
            viewBox="0 0 20 20"
            className={`${sizeClasses[size]} transition-transform duration-150`}
          >
            <defs>
              <linearGradient id={`grad-${star}`}>
                <stop offset="0%" stopColor="#FACC15" /> {/* yellow-400 */}
                <stop
                  offset={`${Math.max(0, Math.min(1, rating - (star - 1))) * 100}%`}
                  stopColor="#FACC15"
                />
                <stop
                  offset={`${Math.max(0, Math.min(1, rating - (star - 1))) * 100}%`}
                  stopColor="#D1D5DB" // gray-300
                />
                <stop offset="100%" stopColor="#D1D5DB" />
              </linearGradient>
            </defs>

            <path
              fill={`url(#grad-${star})`}
              d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
          />
          </svg>
        </button>
      ))}
    </div>
  );
};

export default ReviewStarRating;
