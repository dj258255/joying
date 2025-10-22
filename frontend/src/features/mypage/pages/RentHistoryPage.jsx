/**
 * RentHistoryPage Component
 * 대여 내역 페이지 컴포넌트
 */

import React from 'react';
import { useRentHistory } from '../hooks/useRentHistory';
import RentHistoryTable from '../components/RentHistoryTable';

const RentHistoryPage = () => {
  const { rentHistory, isLoading } = useRentHistory();

  const handleProductClick = (productId) => {
    // TODO: 상품 상세 페이지로 이동
    console.log('상품 클릭:', productId);
  };

  const handleReviewClick = (rentalId) => {
    // TODO: 리뷰 작성 페이지로 이동
    console.log('리뷰 작성:', rentalId);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">대여 내역</h1>
        <p className="text-gray-600 mt-2">내가 대여한 상품들의 내역을 확인할 수 있습니다.</p>
      </div>

      <RentHistoryTable
        rentHistory={rentHistory}
        onProductClick={handleProductClick}
        onReviewClick={handleReviewClick}
        isLoading={isLoading}
      />
    </div>
  );
};

export default RentHistoryPage;
