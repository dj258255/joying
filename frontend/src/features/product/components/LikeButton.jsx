/**
 * LikeButton Component
 * 찜하기 버튼 컴포넌트
 */

import React from 'react';
import { useProductLike } from '../hooks/useProductLike';

/**
 * @param {Object} props
 * @param {string} props.productId - 상품 ID
 * @param {boolean} props.isLiked - 찜하기 상태
 */
const LikeButton = ({ productId, isLiked = false }) => {
  const { toggleLike, isLoading } = useProductLike(productId);

  const handleClick = (e) => {
    e.stopPropagation();
    toggleLike();
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`p-2 rounded-full transition-colors ${
        isLiked 
          ? 'bg-red-500 text-white' 
          : 'bg-white text-gray-600 hover:bg-gray-100'
      } disabled:opacity-50`}
    >
      <svg
        className="w-5 h-5"
        fill={isLiked ? 'currentColor' : 'none'}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
    </button>
  );
};

export default LikeButton;
