/**
 * LikedProductList Component
 * 찜한 상품 목록 컴포넌트
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import ProductCard from './ProductCard';
import { DUMMY_PRODUCTS, DUMMY_USERS } from '../../../shared/constants/dummyData';

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
  const navigate = useNavigate();
  
  // 현재 사용자가 찜한 상품 (다른 사용자들의 상품)
  const myLikedProducts = DUMMY_PRODUCTS.filter(product => product.sellerId !== DUMMY_USERS.currentUser.id);
  
  const displayProducts = likedProducts.length > 0 ? likedProducts : myLikedProducts;
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  if (displayProducts.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="text-gray-500 mb-4">찜한 상품이 없습니다.</div>
          <button 
            onClick={() => navigate('/products')}
            className="bg-gradient-to-r from-gray-800 to-gray-900 text-white px-6 py-3 rounded-lg hover:from-gray-900 hover:to-black transition-all duration-200 font-medium shadow-lg"
          >
            상품 둘러보기
          </button>
        </div>
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
            product={{
              ...product,
              thumbnailUrl: product.thumbnailUrl || product.image || (product.files && product.files.length > 0 ? product.files[0].url : null),
              rentalFee: product.rentalFee || product.price
            }}
            onClick={() => navigate(`/products/${product.id}`)}
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
