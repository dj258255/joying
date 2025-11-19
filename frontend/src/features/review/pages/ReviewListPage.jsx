/**
 * ReviewListPage Component
 * 리뷰 목록 페이지 컴포넌트
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useReviews } from '../hooks/useReviews';
import ReviewListItem from '../components/ReviewListItem';
import ReviewStarRating from '../components/ReviewStarRating';
import { reviewApi } from '@/features/review/api/reviewApi';

const ReviewListPage = ({ type }) => {
  const navigate = useNavigate();
  const { productId, memberId } = useParams();
  const targetId = type === 'product' ? productId : memberId;

  const [filters, setFilters] = useState({
    rating: '',
    sortBy: 'newest',
    page: 1,
    size: 5, // 페이지당 개수
  });

  const { reviews, isLoading, error, refetch } = useReviews(type, targetId, filters);

  let reviewList = reviews?.data || [];
  const currentPage = reviews?.page || filters.page;
  const totalCount = reviews?.totalCount || 0;
  const size = reviews?.size || filters.size;
  const totalPages = Math.ceil(totalCount / size);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1, // 필터 바꾸면 첫 페이지로 이동
    }));
  };

  const handlePageChange = (pageNum) => {
    if (pageNum < 1 || pageNum > totalPages) return;
    setFilters((prev) => ({
      ...prev,
      page: pageNum,
    }));
  };

  const handleEditReview = (review) => {
    navigate(`/reviews/${review.reviewId}/edit`);
  };

  const handleDeleteReview = async (reviewId) => {
    if (window.confirm('정말로 이 리뷰를 삭제하시겠습니까?')) {
      try {
        await reviewApi.deleteReview(reviewId);
        alert('리뷰가 삭제되었습니다.');
        reviewList = reviewList.filter((r) => r.reviewId !== reviewId);
        setFilteredList((prev) => prev.filter((r) => r.reviewId !== reviewId));
      } catch (err) {
        
        alert('리뷰 삭제에 실패했습니다. 다시 시도해주세요.');
      }
    }
  };

  const [filteredList, setFilteredList] = useState([]);

  useEffect(() => {
    if (reviews?.data) {
      setFilteredList(reviews.data);
    }
  }, [reviews?.data]);

  const applyFilters = () => {
    let result = [...reviewList];

    // 별점 필터 (rating 이상)
    if (filters.rating) {
      const minRating = Number(filters.rating);
      result = result.filter((r) => r.rating >= minRating);
    }

    // 정렬
    switch (filters.sortBy) {
      case 'oldest':
        result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
      default:
        // 최신순
        result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    setFilteredList(result);
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
    <div
      className="min-h-screen py-10 px-4 bg-gray-50 flex justify-center"
    >
      <div
        className="w-full max-w-5xl rounded-2xl border border-gray-200 bg-white/90 shadow-xl backdrop-blur-md p-8"
        style={{
          boxShadow:
            '0 10px 30px rgba(0,0,0,0.08), inset 0 0 20px rgba(255,255,255,0.3)',
        }}
      >
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-6 tracking-tight">
            {type === 'product' ? '상품 리뷰 목록' : '사용자 리뷰 목록'}
          </h1>

          {/* 필터 섹션 */}
          <div
            className="rounded-xl p-6 grid grid-cols-1 md:grid-cols-3 gap-4"
            style={{
              background: 'rgba(255,255,255,0.8)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(0,0,0,0.05)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            }}
          >
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                별점 필터
              </label>
              <div className="relative">
                <select
                  value={filters.rating}
                  onChange={(e) => handleFilterChange('rating', e.target.value)}
                  className="appearance-none w-full bg-white text-gray-800 border border-gray-300 rounded-xl px-4 py-2.5 pr-10 shadow-sm hover:shadow-md transition-all focus:ring-2 focus:ring-gray-900 focus:border-gray-900 cursor-pointer"
                >
                  <option value="">전체 별점</option>
                  <option value="5">5점</option>
                  <option value="4">4점 이상</option>
                  <option value="3">3점 이상</option>
                  <option value="2">2점 이상</option>
                  <option value="1">1점 이상</option>
                </select>
                <svg
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                정렬
              </label>
              <div className="relative">
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="appearance-none w-full bg-white text-gray-800 border border-gray-300 rounded-xl px-4 py-2.5 pr-10 shadow-sm hover:shadow-md transition-all focus:ring-2 focus:ring-gray-900 focus:border-gray-900 cursor-pointer"
                >
                  <option value="newest">최신순</option>
                  <option value="oldest">오래된순</option>
                  <option value="rating">별점순</option>
                </select>
                <svg
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            <div className="flex items-end">
              <button
                onClick={applyFilters}
                className="w-full py-2 px-4 rounded-md font-semibold bg-gray-900 text-white hover:bg-black transition-all shadow-md"
              >
                필터 적용
              </button>
            </div>
          </div>
        </div>

        {/* 리뷰 목록 */}
        <div className="space-y-6">
          {filteredList.length > 0 ? (
            filteredList.map((review) => (
              <div
                key={review.reviewId}
                className="rounded-xl bg-white p-6 shadow-sm hover:shadow-md transition-all border border-gray-100"
              >
                <ReviewListItem
                  review={review}
                  onEdit={handleEditReview}
                  onDelete={handleDeleteReview}
                />
              </div>
            ))
          ) : (
            <div className="text-center py-16 text-gray-500 text-lg">
              리뷰가 없습니다 😢
            </div>
          )}
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="mt-10 flex justify-center">
            <nav className="flex space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-4 py-2 rounded-md border transition-all ${
                  currentPage === 1
                    ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                    : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-100'
                }`}
              >
                이전
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`px-4 py-2 rounded-md border transition-all ${
                    pageNum === currentPage
                      ? 'bg-gray-900 text-white border-gray-900 shadow-inner'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-4 py-2 rounded-md border transition-all ${
                  currentPage === totalPages
                    ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                    : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-100'
                }`}
              >
                다음
              </button>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewListPage;
