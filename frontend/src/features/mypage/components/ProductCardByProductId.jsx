/**
 * ProductCardByProductId Component
 * 상품 ID만으로 ProductCard를 렌더링하는 컴포넌트
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import ProductCard from './ProductCard';
import { useProductDetail } from '@/features/product/hooks/useProductDetail';

/**
 * @param {Object} props
 * @param {number|string} props.productId - 상품 ID
 * @param {string} props.status - 상품 상태 ('available', 'unavailable', 'rented', 'completed', 'pending')
 * @param {Function} props.onClick - 클릭 핸들러 (선택사항)
 */
const ProductCardByProductId = ({ 
  productId, 
  status = 'available',
  onClick 
}) => {
  const navigate = useNavigate();
  const { product: productResponse, isLoading } = useProductDetail(productId);
  
  // 응답 구조: { status, message, data, timestamp } 또는 { body: { data } }
  const product = productResponse?.data || productResponse?.body?.data || productResponse;

  // 상품 정보가 로딩 중이면 스켈레톤 또는 로딩 표시
  if (isLoading || !product) {
    return (
      <div className="glass-product-card-new">
        <div className="glass-product-image-main">
          <div className="glass-product-image-placeholder-bg">
            <div className="animate-pulse bg-gray-200 w-full h-full rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  // 상품 상세 정보에서 썸네일 찾기
  // files 배열에서 thumbnail이 true인 파일을 찾거나, 없으면 첫 번째 파일 사용
  const thumbnailFile = product.files?.find(file => file.thumbnail === true) || product.files?.[0];
  const thumbnailUrl = thumbnailFile?.url || null;

  return (
    <ProductCard
      product={{
        id: product.productId || productId,
        title: product.title,
        thumbnailUrl: thumbnailUrl,
        category: product.category?.name || (typeof product.category === 'string' ? product.category : null),
        rentalFee: product.rentalFee || product.rental_fee
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) {
          onClick(e);
        } else {
          navigate(`/products/${productId}`);
        }
      }}
      actionType="view"
      status={status}
      showStats={false}
      showDate={false}
    />
  );
};

export default ProductCardByProductId;

