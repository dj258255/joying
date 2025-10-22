/**
 * ProductCard Component
 * 상품 카드 컴포넌트
 */

import React from 'react';
import LikeButton from './LikeButton';

/**
 * @param {Object} props
 * @param {Object} props.product - 상품 데이터
 * @param {Function} props.onClick - 클릭 핸들러
 */
const ProductCard = ({ product, onClick }) => {
  const {
    id,
    title,
    price,
    imageUrl,
    location,
    isLiked,
    category
  } = product;

  const formatPrice = (price) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  return (
    <div
      onClick={() => onClick(id)}
      className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
    >
      <div className="relative">
        <img
          src={imageUrl || '/placeholder-image.jpg'}
          alt={title}
          className="w-full h-48 object-cover"
        />
        <div className="absolute top-2 right-2">
          <LikeButton productId={id} isLiked={isLiked} />
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
          {title}
        </h3>
        
        <div className="flex items-center justify-between mb-2">
          <span className="text-xl font-bold text-blue-600">
            {formatPrice(price)}원/일
          </span>
          <span className="text-sm text-gray-500">
            {location}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
            {category}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
