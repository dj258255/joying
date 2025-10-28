/**
 * RegisteredProductList Component
 * 등록 상품 목록 컴포넌트
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import ProductCard from './ProductCard';
import { DUMMY_PRODUCTS, DUMMY_USERS } from '../../../shared/constants/dummyData';
import { ROUTE_PATHS } from '../../../shared/constants/routePaths';

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
  const navigate = useNavigate();
  
  // 현재 사용자가 등록한 상품만 필터링
  const myProducts = DUMMY_PRODUCTS.filter(product => product.sellerId === DUMMY_USERS.currentUser.id);
  
  const displayProducts = products.length > 0 ? products : myProducts;
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
        <button 
          onClick={() => navigate(ROUTE_PATHS.PRODUCT_CREATE)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          첫 상품 등록하기
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* 상품 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onClick={() => navigate(`/products/${product.id}`)}
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
