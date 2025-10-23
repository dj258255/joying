/**
 * LikedProductList Component
 * 찜한 상품 목록 컴포넌트
 */

import React from 'react';
import ProductCard from './ProductCard';

/**
 * @param {Object} props
 * @param {Array} props.likedProducts - 찜한 상품 목록
 * @param {Function} props.onProductClick - 상품 클릭 핸들러
 * @param {Function} props.onUnlikeProduct - 찜하기 취소 핸들러
 * @param {boolean} props.isLoading - 로딩 상태
 */
const LikedProductList = ({ 
  likedProducts = [], 
  onProductClick = () => {}, 
  onUnlikeProduct = () => {}, 
  isLoading = false 
}) => {
  // 더미 데이터
  const dummyLikedProducts = [
    {
      id: 1,
      title: '아이폰 15 Pro',
      category: '전자제품',
      price: 25000,
      location: '서울시 강남구',
      image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400',
      likedAt: '2024-01-15'
    },
    {
      id: 2,
      title: '소니 WH-1000XM5 헤드폰',
      category: '오디오',
      price: 12000,
      location: '서울시 마포구',
      image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400',
      likedAt: '2024-01-10'
    },
    {
      id: 3,
      title: '닌텐도 스위치',
      category: '게임',
      price: 8000,
      location: '서울시 서초구',
      image: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=400',
      likedAt: '2024-01-08'
    }
  ];

  const displayProducts = likedProducts.length > 0 ? likedProducts : dummyLikedProducts;
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
        <div className="text-gray-500 mb-4">찜한 상품이 없습니다.</div>
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
          찜한 상품
        </h3>
          <div className="flex space-x-1 lg:space-x-2">
            <button className="glass-button-ghost text-xs lg:text-base px-2 py-1 lg:px-6 lg:py-3">
              전체 선택
            </button>
            <button className="glass-button-danger text-xs lg:text-base px-2 py-1 lg:px-6 lg:py-3">
              선택 삭제
            </button>
          </div>
        </div>
      </div>

      {/* 상품 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onClick={() => onProductClick(product.id)}
            onAction={() => onUnlikeProduct(product.id)}
            actionType="unlike"
            status="available"
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

export default LikedProductList;
