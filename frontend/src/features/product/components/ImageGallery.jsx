/**
 * ImageGallery Component
 * 상품 이미지 갤러리 컴포넌트
 */

import React, { useState } from 'react';

const ImageGallery = ({ images = [], productTitle = '', isLiked = false, onLikeClick }) => {
  const [selectedImage, setSelectedImage] = useState(0);

  const defaultImages = [
    'https://via.placeholder.com/800x800/E5E7EB/9CA3AF?text=Product+Image',
    'https://via.placeholder.com/800x800/E5E7EB/9CA3AF?text=Detail+1',
    'https://via.placeholder.com/800x800/E5E7EB/9CA3AF?text=Detail+2',
    'https://via.placeholder.com/800x800/E5E7EB/9CA3AF?text=Detail+3'
  ];

  const displayImages = images.length > 0 ? images : defaultImages;

  return (
    <div className="space-y-4">
      {/* 메인 이미지 */}
      <div className="relative w-full aspect-square bg-gray-100 rounded-2xl overflow-hidden">
        <img
          src={displayImages[selectedImage]}
          alt={`${productTitle} - 이미지 ${selectedImage + 1}`}
          className="w-full h-full object-cover"
        />
        
        {/* 찜하기 버튼 */}
        {onLikeClick && (
          <button
            onClick={onLikeClick}
            className="absolute top-4 right-4 p-3 rounded-xl bg-white/90 backdrop-blur-sm shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
          >
            <svg
              className="w-5 h-5"
              fill={isLiked ? 'currentColor' : 'none'}
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{ color: isLiked ? '#FF1744' : '#666' }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </button>
        )}
      </div>

      {/* 썸네일 갤러리 */}
      {displayImages.length > 1 && (
        <div className="flex gap-3">
          {displayImages.slice(0, 4).map((image, index) => (
            <button
              key={index}
              onClick={() => setSelectedImage(index)}
              className={`relative w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden transition-all duration-200 ${
                selectedImage === index
                  ? 'ring-2 ring-gray-900'
                  : 'ring-1 ring-gray-200 hover:ring-gray-400 opacity-70 hover:opacity-100'
              }`}
            >
              <img
                src={image}
                alt={`썸네일 ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageGallery;
