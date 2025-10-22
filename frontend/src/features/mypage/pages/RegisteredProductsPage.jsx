/**
 * RegisteredProductsPage Component
 * 등록 상품 페이지 컴포넌트
 */

import React from 'react';
import RegisteredProductList from '../components/RegisteredProductList';

const RegisteredProductsPage = () => {
  // TODO: 등록 상품 API 연동
  const registeredProducts = [];
  const isLoading = false;

  const handleProductClick = (productId) => {
    // TODO: 상품 상세 페이지로 이동
    console.log('상품 클릭:', productId);
  };

  const handleEditProduct = (product) => {
    // TODO: 상품 수정 페이지로 이동
    console.log('상품 수정:', product);
  };

  const handleDeleteProduct = (productId) => {
    // TODO: 상품 삭제 API 호출
    console.log('상품 삭제:', productId);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">등록 상품</h1>
        <p className="text-gray-600 mt-2">내가 등록한 상품들을 관리할 수 있습니다.</p>
      </div>

      <RegisteredProductList
        products={registeredProducts}
        onProductClick={handleProductClick}
        onEditProduct={handleEditProduct}
        onDeleteProduct={handleDeleteProduct}
        isLoading={isLoading}
      />
    </div>
  );
};

export default RegisteredProductsPage;
