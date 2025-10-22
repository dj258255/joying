/**
 * ReviewListPage Component
 * 리뷰 목록 페이지 컴포넌트
 */

import React, { useState } from 'react';
import { useReviews } from '../hooks/useReviews';
import ReviewListItem from '../components/ReviewListItem';
import ReviewStarRating from '../components/ReviewStarRating';

const ReviewListPage = () => {
  const [filters, setFilters] = useState({
    rating: '',
    sortBy: 'newest'
  });

  const { reviews, isLoading, error } = useReviews(filters);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleEditReview = (review) => {
    // TODO: 리뷰 수정 페이지로 이동
    console.log('리뷰 수정:', review);
  };

  const handleDeleteReview = (reviewId) => {
    if (window.confirm('정말로 이 리뷰를 삭제하시겠습니까?')) {
      // TODO: 리뷰 삭제 API 호출
      console.log('리뷰 삭제:', reviewId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">리뷰를 불러올 수 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">리뷰 목록</h1>
        
        {/* 필터 섹션 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                별점 필터
              </label>
              <select
                value={filters.rating}
                onChange={(e) => handleFilterChange('rating', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">전체</option>
                <option value="5">5점</option>
                <option value="4">4점 이상</option>
                <option value="3">3점 이상</option>
                <option value="2">2점 이상</option>
                <option value="1">1점 이상</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                정렬
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="newest">최신순</option>
                <option value="oldest">오래된순</option>
                <option value="rating">별점순</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">
                필터 적용
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 리뷰 목록 */}
      <div className="space-y-6">
        {reviews.length > 0 ? (
          reviews.map((review) => (
            <ReviewListItem
              key={review.id}
              review={review}
              onEdit={handleEditReview}
              onDelete={handleDeleteReview}
              isOwner={review.isOwner}
            />
          ))
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">리뷰가 없습니다.</div>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              첫 리뷰 작성하기
            </button>
          </div>
        )}
      </div>

      {/* 페이지네이션 */}
      {reviews.length > 0 && (
        <div className="mt-8 flex justify-center">
          <nav className="flex space-x-2">
            <button className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
              이전
            </button>
            <button className="px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-md">
              1
            </button>
            <button className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
              2
            </button>
            <button className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
              다음
            </button>
          </nav>
        </div>
      )}
    </div>
  );
};

export default ReviewListPage;
