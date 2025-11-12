/**
 * ReviewListItem Component
 * 리뷰 목록 아이템 컴포넌트
 */

import React from 'react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import ReviewStarRating from './ReviewStarRating';

/**
 * @param {Object} props
 * @param {Object} props.review - 리뷰 데이터
 * @param {Function} props.onEdit - 리뷰 수정 핸들러
 * @param {Function} props.onDelete - 리뷰 삭제 핸들러
 * @param {boolean} props.isOwner - 리뷰 작성자 여부
 */
const ReviewListItem = ({ review, onEdit, onDelete, isOwner = false }) => {
  const { user, isAuthenticated } = useAuth();

  isOwner = isAuthenticated && user && review.reviewerId === user.memberId;

  const {
    reviewId,
    content,
    rating,
    createdAt,
    reviewerName,
    product,
    isEdited,
    profileImageUrl,
  } = review;

  const imageUrls = Array.isArray(review.imageUrls) ? review.imageUrls : [];

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  const formatRelativeTime = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return '오늘';
    if (diffInDays === 1) return '어제';
    if (diffInDays < 7) return `${diffInDays}일 전`;
    return formatDate(dateString);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      {/* 리뷰 헤더 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
            {profileImageUrl ? (
              <img
                src={profileImageUrl}
                alt="프로필 이미지"
                className="w-10 h-10 rounded-full object-cover"
                onError={(e) => {
                  // 이미지 로드 실패 시 fallback
                  e.target.onerror = null;
                  e.target.src = 'https://cdn-icons-png.flaticon.com/512/149/149071.png'; // 기본 이미지 경로
                }}
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-600 font-medium">{reviewerName?.charAt(0) || '?'}</span>
              </div>
            )}
          </div>
          <div>
            <div className="font-medium text-gray-900">
              {reviewerName || '알 수 없음'}
            </div>
            <div className="flex items-center space-x-2">
              <ReviewStarRating rating={rating} size="sm" readOnly />
              <span className="text-sm text-gray-500">
                {formatRelativeTime(createdAt)}
                {isEdited && ' (수정됨)'}
              </span>
            </div>
          </div>
        </div>
        
        {isOwner && (
          <div className="flex space-x-2">
            <button
              onClick={() => onEdit(review)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(reviewId)}
              className="text-gray-400 hover:text-red-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* 상품 정보 (상품 리뷰인 경우) */}
      {product && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            {product.image && (
              <img
                src={product.image}
                alt={product.title}
                className="w-12 h-12 object-cover rounded"
              />
            )}
            <div>
              <div className="font-medium text-gray-900">{product.title}</div>
              <div className="text-sm text-gray-600">{product.category}</div>
            </div>
          </div>
        </div>
      )}

      {/* 리뷰 이미지 썸네일 영역 */}
      {imageUrls.length > 0 && (
        <div className="flex gap-3 overflow-x-auto py-2 scrollbar-hide">
          {imageUrls.map((url, idx) => (
            <div
              key={idx}
              className="relative flex-shrink-0 w-28 h-28 rounded-lg overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer"
              onClick={() => setSelectedImage(url)}
            >
              <img
                src={url}
                alt={`리뷰 이미지 ${idx + 1}`}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
              />
            </div>
          ))}
        </div>
      )}

      {/* 리뷰 내용 */}
      <div className="text-gray-700 whitespace-pre-wrap">
        {content}
      </div>

      {/* 리뷰 액션 */}
      {/* <div className="mt-4 flex items-center justify-between">
        <div className="flex space-x-4">
          <button className="text-sm text-gray-500 hover:text-gray-700">
            도움됨
          </button>
          <button className="text-sm text-gray-500 hover:text-gray-700">
            신고
          </button>
        </div>
      </div> */}
    </div>
  );
};

export default ReviewListItem;
