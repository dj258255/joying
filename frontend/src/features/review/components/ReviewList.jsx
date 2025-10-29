/**
 * ReviewList Component
 * 기기 리뷰 목록 컴포넌트
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileImage from '../../../shared/components/ProfileImage';

const ReviewList = ({ reviews = [] }) => {
  const navigate = useNavigate();
  
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };
  
  return (
    <div className="glass-card p-4 md:p-6 space-y-4 md:space-y-6">
      <h3 className="text-lg md:text-xl font-bold text-gray-900">리뷰</h3>

      {/* 리뷰 목록 */}
      <div className="space-y-3 md:space-y-4">
        {reviews.map((review, index) => (
          <div
            key={review.id || index}
            className="p-3 md:p-4 border border-gray-200 rounded-2xl hover:shadow-md transition-shadow"
          >
            <div className="flex items-center space-x-2 mb-2">
              <ProfileImage
                src={review.reviewer?.profileImage}
                alt={review.reviewer?.nickname || '익명'}
                size={40}
                className="w-8 h-8 md:w-10 md:h-10"
              />
              <div>
                <div className="font-medium text-gray-900 text-sm md:text-base">
                  {review.reviewer?.nickname || '익명'}
                </div>
                <div className="text-xs text-gray-500">
                  {formatDate(review.createdAt)}
                </div>
              </div>
            </div>
            <p className="text-gray-700 leading-relaxed text-sm md:text-base mb-3">{review.content}</p>
            
            {/* 상품 정보 표시 */}
            {review.product && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
                <div className="flex items-center gap-3">
                  <img
                    src={review.product.images?.[0]}
                    alt={review.product.title}
                    className="w-12 h-12 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{review.product.title}</div>
                    <div className="text-sm text-gray-600">{review.product.price.toLocaleString()}원/일</div>
                  </div>
                  <button
                    onClick={() => navigate(`/products/${review.product.id}`)}
                    className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
                  >
                    상품 보기
                  </button>
                </div>
              </div>
            )}
            
            {/* 리뷰 이미지 */}
            {review.images && review.images.length > 0 && (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {review.images.map((image, imgIndex) => (
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
        ))}

        {reviews.length === 0 && (
          <div className="text-center py-8 md:py-12 text-gray-500 text-sm md:text-base">
            등록된 리뷰가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewList;
