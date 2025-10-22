/**
 * RegisteredProductList Component
 * 등록 상품 목록 컴포넌트
 */

import React from 'react';
import { ProductCard } from '@/features/product';

/**
 * @param {Object} props
 * @param {Array} props.products - 등록 상품 목록
 * @param {Function} props.onProductClick - 상품 클릭 핸들러
 * @param {Function} props.onEditProduct - 상품 수정 핸들러
 * @param {Function} props.onDeleteProduct - 상품 삭제 핸들러
 * @param {boolean} props.isLoading - 로딩 상태
 */
const RegisteredProductList = ({ 
  products, 
  onProductClick, 
  onEditProduct, 
  onDeleteProduct, 
  isLoading = false 
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  if (products.length === 0) {
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
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          내가 등록한 상품 ({products.length}개)
        </h3>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          새 상품 등록
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <div key={product.id} className="relative group">
            <ProductCard
              product={product}
              onClick={() => onProductClick(product.id)}
            />
            
            {/* 관리 버튼 */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditProduct(product);
                  }}
                  className="p-2 bg-white rounded-full shadow hover:bg-gray-50"
                  title="수정"
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteProduct(product.id);
                  }}
                  className="p-2 bg-white rounded-full shadow hover:bg-gray-50"
                  title="삭제"
                >
                  <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 상품 상태 */}
            <div className="absolute top-2 left-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                product.isAvailable 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {product.isAvailable ? '대여 가능' : '대여 불가'}
              </span>
            </div>

            {/* 통계 정보 */}
            <div className="absolute bottom-2 left-2 right-2">
              <div className="bg-white bg-opacity-90 rounded-lg p-2">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>조회 {product.viewCount || 0}</span>
                  <span>찜 {product.likeCount || 0}</span>
                  <span>대여 {product.rentalCount || 0}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 페이지네이션 */}
      {products.length > 0 && (
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

export default RegisteredProductList;
