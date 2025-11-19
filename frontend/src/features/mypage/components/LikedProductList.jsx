/**
 * LikedProductList Component
 * 찜한 상품 목록 컴포넌트
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductCardLikeWrapper from '../../product/components/ProductCardLikeWrapper';
import { useLikedProducts } from '../../product/hooks/useLikedProducts';

/**
 * @param {Object} props
 * @param {Function} props.onProductClick - 상품 클릭 핸들러
 */
const LikedProductList = ({ 
  onProductClick = () => {}
}) => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 20;

  

  // 찜한 상품 목록 조회
  const { data, isLoading, isError, error } = useLikedProducts({
    page: currentPage,
    size: pageSize
  });

  const likedProducts = data?.content || [];
  const totalPages = data?.totalPages || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-500 mb-4">오류가 발생했습니다.</div>
          <div className="text-gray-600 text-sm">{error?.message || '알 수 없는 오류'}</div>
        </div>
      </div>
    );
  }

  if (likedProducts.length === 0) {
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
    <div className="space-y-3 sm:space-y-6">
      {/* 상품 그리드 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-2 md:gap-4 lg:gap-6">
        {likedProducts.map((product) => {
          const productId = product.productId || product.id;
          
          // 장소 정보 추출
          const dongId = product.region?.dongId || product.dongId;
          const dong = product.region?.dong || product.dong || '';
          const sido = product.region?.sido || product.sido || '';
          const gugun = product.region?.gungu || product.gugun || '';
          
          const productData = {
            ...product,
            productId: productId,
            thumbnailUrl: product.thumbnailUrl || product.image || (product.files && product.files.length > 0 ? product.files[0].url : null),
            rentalFee: product.rentalFee || product.price,
            // 장소 정보 개별 필드 추가 (ProductCard의 장소 표시용)
            dongId: dongId,
            dong: dong,
            sido: sido,
            gugun: gugun
          };
          
          return (
            <ProductCardLikeWrapper
              key={productId}
              product={productData}
              onClick={() => {
                onProductClick(productId);
                navigate(`/products/${productId}`);
              }}
              actionType="unlike"
              status="available"
              showStats={false}
              showDate={false}
            />
          );
        })}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="glass-pagination">
          <nav className="flex space-x-2">
            <button 
              className="glass-pagination-button glass-pagination-prev"
              onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
              disabled={currentPage === 0}
            >
              이전
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                className={`glass-pagination-button ${currentPage === i ? 'glass-pagination-active' : ''}`}
                onClick={() => setCurrentPage(i)}
              >
                {i + 1}
              </button>
            ))}
            <button 
              className="glass-pagination-button glass-pagination-next"
              onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
              disabled={currentPage === totalPages - 1}
            >
              다음
            </button>
          </nav>
        </div>
      )}
    </div>
  );
};

export default LikedProductList;
