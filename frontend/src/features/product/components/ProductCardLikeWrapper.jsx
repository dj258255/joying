/**
 * ProductCardLikeWrapper Component
 * ProductCard에 찜하기 기능을 추가하는 래퍼 컴포넌트
 */

import React, { useState, useEffect } from 'react';
import ProductCard from '../../mypage/components/ProductCard';
import { useProductLike } from '../hooks/useProductLike';

/**
 * @param {Object} props
 * @param {Object} props.product - 상품 정보
 * @param {Function} props.onClick - 카드 클릭 핸들러
 * @param {string} props.actionType - 액션 타입
 * @param {string} props.status - 상품 상태
 * @param {boolean} props.showStats - 통계 정보 표시 여부
 * @param {boolean} props.showDate - 날짜 정보 표시 여부
 */
const ProductCardLikeWrapper = ({
  product,
  onClick,
  actionType = 'view',
  status = 'available',
  showStats = false,
  showDate = false
}) => {
  const productId = product?.productId || product?.id;
  // 서버 응답에 liked 필드가 있으면 그 값을 사용, 없으면 undefined (임의로 false 설정하지 않음)
  const initialLiked = product?.liked !== undefined ? product.liked : (product?.isLiked !== undefined ? product.isLiked : undefined);
  
  // 로컬 상태로 즉시 UI 반영 (undefined일 경우 false로 표시)
  const [isLiked, setIsLiked] = useState(initialLiked ?? false);
  
  const { toggleLike, isLoading } = useProductLike(productId);

  // product가 변경되면 isLiked 상태 동기화
  useEffect(() => {
    // 서버 응답에 liked 필드가 있으면 그 값을 사용, 없으면 undefined
    const newLiked = product?.liked !== undefined ? product.liked : (product?.isLiked !== undefined ? product.isLiked : undefined);
    console.log('[ProductCardLikeWrapper] product 변경 감지:', { 
      productId, 
      oldLiked: isLiked, 
      newLiked,
      initialLiked,
      hasLikedField: 'liked' in (product || {}),
      hasIsLikedField: 'isLiked' in (product || {})
    });
    // undefined일 경우 false로 표시 (UI용)
    setIsLiked(newLiked ?? false);
  }, [product?.liked, product?.isLiked, productId]);

  const handleLike = (currentLiked) => {
    if (isLoading || !productId) {
      console.warn('[ProductCardLikeWrapper] 찜하기 불가:', { isLoading, productId });
      return;
    }
    console.log('[ProductCardLikeWrapper] 찜하기 클릭:', { productId, currentLiked });
    
    // 이전 상태 저장 (에러 시 롤백용)
    const previousLiked = isLiked;
    
    // 즉시 UI 업데이트 (optimistic update)
    setIsLiked(prev => !prev);
    
    // API 호출
    toggleLike(currentLiked).catch((error) => {
      // 에러 발생 시 이전 상태로 롤백
      console.error('[ProductCardLikeWrapper] 찜하기 실패, 상태 롤백:', error);
      setIsLiked(previousLiked);
    });
  };

  return (
    <ProductCard
      product={product}
      onClick={onClick}
      actionType={actionType}
      status={status}
      showStats={showStats}
      showDate={showDate}
      onLike={handleLike}
      isLiked={isLiked}
    />
  );
};

export default ProductCardLikeWrapper;

