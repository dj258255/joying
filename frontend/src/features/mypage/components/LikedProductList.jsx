/**
 * LikedProductList Component
 * 찜한 상품 목록 컴포넌트
 */

import React from 'react';
import { ProductCard } from '@/features/product';

/**
 * @param {Object} props
 * @param {Array} props.likedProducts - 찜한 상품 목록
 * @param {Function} props.onProductClick - 상품 클릭 핸들러
 * @param {Function} props.onUnlikeProduct - 찜하기 취소 핸들러
 * @param {boolean} props.isLoading - 로딩 상태
 */
const LikedProductList = ({ 
  likedProducts, 
  onProductClick, 
  onUnlikeProduct, 
  isLoading = false 
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  if (likedProducts.length === 0) {
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
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          찜한 상품 ({likedProducts.length}개)
        </h3>
        <div className="flex space-x-2">
          <button className="text-gray-600 hover:text-gray-800">
            전체 선택
          </button>
          <button className="text-red-600 hover:text-red-800">
            선택 삭제
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {likedProducts.map((product) => (
          <div key={product.id} className="relative group">
            <ProductCard
              product={product}
              onClick={() => onProductClick(product.id)}
            />
            
            {/* 찜하기 취소 버튼 */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUnlikeProduct(product.id);
                }}
                className="p-2 bg-white rounded-full shadow hover:bg-gray-50"
                title="찜하기 취소"
              >
                <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            {/* 찜한 날짜 */}
            <div className="absolute bottom-2 left-2 right-2">
              <div className="bg-white bg-opacity-90 rounded-lg p-2">
                <div className="text-xs text-gray-600">
                  찜한 날짜: {new Date(product.likedAt).toLocaleDateString('ko-KR')}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 페이지네이션 */}
      {likedProducts.length > 0 && (
        <div className="flex justify-center mt-8">
          <nav className="flex space-x-2">
            <button className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
              이전
            </button>
            <button className="px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-md">
              1
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

export default LikedProductList;
