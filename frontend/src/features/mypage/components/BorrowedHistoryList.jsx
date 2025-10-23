/**
 * BorrowedHistoryList Component
 * 빌린 내역 목록 컴포넌트
 */

import React from 'react';
import ProductCard from './ProductCard';

/**
 * @param {Object} props
 * @param {Array} props.borrowedHistory - 빌린 내역 목록
 * @param {Function} props.onProductClick - 상품 클릭 핸들러
 * @param {Function} props.onReviewClick - 리뷰 작성 핸들러
 * @param {boolean} props.isLoading - 로딩 상태
 */
const BorrowedHistoryList = ({ 
  borrowedHistory = [], 
  onProductClick = () => {}, 
  onReviewClick = () => {}, 
  isLoading = false 
}) => {
  // 더미 데이터
  const dummyBorrowedHistory = [
    {
      id: 1,
      product: {
        id: 1,
        title: 'MacBook Pro 16인치',
        category: '전자제품',
        price: 50000,
        location: '서울시 강남구',
        image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400'
      },
      startDate: '2024-01-10',
      endDate: '2024-01-15',
      status: 'completed'
    },
    {
      id: 2,
      product: {
        id: 2,
        title: '캐논 EOS R5 카메라',
        category: '카메라',
        price: 30000,
        location: '서울시 마포구',
        image: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400'
      },
      startDate: '2024-01-20',
      endDate: '2024-01-25',
      status: 'in_progress'
    }
  ];

  const displayHistory = borrowedHistory.length > 0 ? borrowedHistory : dummyBorrowedHistory;
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  if (displayHistory.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 mb-4">빌린 내역이 없습니다.</div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          상품 둘러보기
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 섹션 */}
      <div className="glass-product-header p-4">
        <div className="flex items-center justify-between w-full">
        <h3 className="glass-section-title text-lg lg:text-2xl">
          빌린 내역
        </h3>
        </div>
      </div>

      {/* 상품 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayHistory.map((rental) => (
          <ProductCard
            key={rental.id}
            product={rental.product}
            onClick={() => onProductClick(rental.product?.id)}
            onAction={() => onProductClick(rental.product?.id)}
            actionType="view"
            status={rental.status === 'completed' ? 'completed' : 
                   rental.status === 'in_progress' ? 'rented' : 
                   rental.status === 'cancelled' ? 'unavailable' : 'pending'}
            showStats={false}
            showDate={false}
          />
        ))}
      </div>
    </div>
  );
};

export default BorrowedHistoryList;