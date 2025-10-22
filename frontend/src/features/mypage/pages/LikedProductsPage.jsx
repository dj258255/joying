/**
 * LikedProductsPage Component
 * 찜한 상품 페이지 컴포넌트
 */

import React from 'react';
import { useLikedProducts } from '../hooks/useLikedProducts';
import LikedProductList from '../components/LikedProductList';

const LikedProductsPage = () => {
  const { likedProducts, isLoading } = useLikedProducts();

  const handleProductClick = (productId) => {
    // TODO: 상품 상세 페이지로 이동
    console.log('상품 클릭:', productId);
  };

  const handleUnlikeProduct = (productId) => {
    // TODO: 찜하기 취소 API 호출
    console.log('찜하기 취소:', productId);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">찜한 상품</h1>
        <p className="text-gray-600 mt-2">찜한 상품들을 확인하고 관리할 수 있습니다.</p>
      </div>

      <LikedProductList
        likedProducts={likedProducts}
        onProductClick={handleProductClick}
        onUnlikeProduct={handleUnlikeProduct}
        isLoading={isLoading}
      />
    </div>
  );
};

export default LikedProductsPage;
