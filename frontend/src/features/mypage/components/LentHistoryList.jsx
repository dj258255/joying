/**
 * LentHistoryList Component
 * 빌려준 내역 목록 컴포넌트
 */

import React from 'react';
import ProductCard from './ProductCard';

/**
 * @param {Object} props
 * @param {Array} props.lentHistory - 빌려준 내역 목록
 * @param {Function} props.onProductClick - 상품 클릭 핸들러
 * @param {Function} props.onReviewClick - 리뷰 작성 핸들러
 * @param {boolean} props.isLoading - 로딩 상태
 */
const LentHistoryList = ({ 
  lentHistory = [], 
  onProductClick = () => {}, 
  onReviewClick = () => {}, 
  isLoading = false 
}) => {
  // 더미 데이터
  const dummyLentHistory = [
    {
      id: 1,
      product: {
        id: 1,
        title: '다이슨 V15 무선청소기',
        category: '생활용품',
        price: 15000,
        location: '서울시 서초구',
        image: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400'
      },
      startDate: '2024-01-12',
      endDate: '2024-01-18',
      status: 'completed'
    },
    {
      id: 2,
      product: {
        id: 2,
        title: '아이패드 Pro 12.9인치',
        category: '전자제품',
        price: 20000,
        location: '서울시 강남구',
        image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400'
      },
      startDate: '2024-01-22',
      endDate: '2024-01-28',
      status: 'in_progress'
    }
  ];

  const displayHistory = lentHistory.length > 0 ? lentHistory : dummyLentHistory;
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
        <div className="text-gray-500 mb-4">빌려준 내역이 없습니다.</div>
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
          빌려준 내역
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

export default LentHistoryList;