/**
 * ReviewCard Component
 * 통합 리뷰 카드 컴포넌트
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileImage from '../../../shared/components/ProfileImage';

const ReviewCard = ({ review, showProductInfo = true, showRating = false }) => {
  const navigate = useNavigate();

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return '';
      }
      return date.toLocaleDateString('ko-KR');
    } catch (error) {
      return '';
    }
  };

  const renderStars = (rating) => {
    return [...Array(5)].map((_, i) => (
      <svg
        key={i}
        className={`w-3 h-3 md:w-4 md:h-4 ${
          i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ));
  };

  // reviewer 정보 안전하게 처리
  const reviewer = review.reviewer || review.writer || {};
  
  return (
    <div className="p-3 md:p-4 border border-gray-200 rounded-2xl hover:shadow-md transition-shadow">
      {/* 리뷰어 정보 */}
      <div className="flex items-center space-x-2 mb-2">
        <ProfileImage
          src={review?.profileImageUrl || review?.reviewer?.profileImageUrl}
          alt={review?.nickname || review?.reviewer?.nickname || '익명'}
          size={40}
          className="w-8 h-8 md:w-10 md:h-10"
        />
        <div className="flex-1">
          <div className="font-medium text-gray-900 text-sm md:text-base">
            {review?.nickname || review?.reviewer?.nickname || '익명'}
          </div>
          <div className="text-xs text-gray-500">
            {formatDate(review.createdAt)}
          </div>
        </div>
        {/* 별점 표시 (옵션) */}
        {showRating && review.rating != null && (
          <div className="flex items-center space-x-1">
            {renderStars(review.rating)}
            <span className="text-xs text-gray-500 ml-1">{review.rating.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* 리뷰 제목 */}
      {review.title && (
        <h4 className="font-semibold text-gray-900 mb-2 text-sm md:text-base">
          {review.title}
        </h4>
      )}

      {/* 리뷰 내용 */}
      <p className="text-gray-700 leading-relaxed text-sm md:text-base mb-3">
        {review.content}
      </p>

      {/* 리뷰 이미지 */}
      {review.imageUrls && review.imageUrls.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {review.imageUrls.map((image, imgIndex) => (
            <img
              key={imgIndex}
              src={image}
              alt={`리뷰 이미지 ${imgIndex + 1}`}
              className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ReviewCard;
