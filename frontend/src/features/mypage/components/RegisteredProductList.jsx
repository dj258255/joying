/**
 * RegisteredProductList Component
 * 등록 상품 목록 컴포넌트
 */

import React from 'react';
import ProductCard from './ProductCard';

/**
 * @param {Object} props
 * @param {Array} props.products - 등록 상품 목록
 * @param {Function} props.onProductClick - 상품 클릭 핸들러
 * @param {Function} props.onEditProduct - 상품 수정 핸들러
 * @param {Function} props.onDeleteProduct - 상품 삭제 핸들러
 * @param {boolean} props.isLoading - 로딩 상태
 */
const RegisteredProductList = ({ 
  products = [], 
  onProductClick = () => {}, 
  onEditProduct = () => {}, 
  onDeleteProduct = () => {}, 
  isLoading = false 
}) => {
  // 더미 데이터
  const dummyProducts = [
    {
      id: 1,
      title: 'MacBook Pro 16인치',
      category: '전자제품',
      price: 50000,
      location: '서울시 강남구',
      image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400',
      isAvailable: true,
      viewCount: 45,
      likeCount: 12,
      rentalCount: 3
    },
    {
      id: 2,
      title: '캐논 EOS R5 카메라',
      category: '카메라',
      price: 30000,
      location: '서울시 마포구',
      image: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400',
      isAvailable: false,
      viewCount: 23,
      likeCount: 8,
      rentalCount: 1
    },
    {
      id: 3,
      title: '다이슨 V15 무선청소기',
      category: '생활용품',
      price: 15000,
      location: '서울시 서초구',
      image: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400',
      isAvailable: true,
      viewCount: 67,
      likeCount: 15,
      rentalCount: 5
    }
  ];

  const displayProducts = products.length > 0 ? products : dummyProducts;
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  if (displayProducts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 mb-4">등록된 상품이 없습니다.</div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          첫 상품 등록하기
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
          내가 등록한 상품
        </h3>
          <button className="glass-button-primary text-sm lg:text-base px-3 py-2 lg:px-6 lg:py-3">
            새 상품 등록
          </button>
        </div>
      </div>

      {/* 상품 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onClick={() => onProductClick(product.id)}
            onAction={() => onEditProduct(product)}
            actionType="edit"
            status={product.isAvailable ? 'available' : 'unavailable'}
            showStats={false}
            showDate={false}
          />
        ))}
      </div>

      {/* 페이지네이션 */}
      {displayProducts.length > 0 && (
        <div className="glass-pagination">
          <nav className="flex space-x-2">
            <button className="glass-pagination-button glass-pagination-prev">
              이전
            </button>
            <button className="glass-pagination-button glass-pagination-active">
              1
            </button>
            <button className="glass-pagination-button glass-pagination-next">
              다음
            </button>
          </nav>
        </div>
      )}
    </div>
  );
};

export default RegisteredProductList;
