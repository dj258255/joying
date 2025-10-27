/**
 * ImageGallery Component
 * 상품 이미지 갤러리 컴포넌트
 */

import React, { useState } from 'react';

const ImageGallery = ({ images = [], productTitle = '', isLiked = false, onLikeClick }) => {
  const [selectedImage, setSelectedImage] = useState(0);

  const defaultImages = [
    'https://via.placeholder.com/800x600/0066CC/FFFFFF?text=Product+Image',
    'https://via.placeholder.com/800x600/33AAFF/FFFFFF?text=Detail+1',
    'https://via.placeholder.com/800x600/66CCFF/FFFFFF?text=Detail+2',
    'https://via.placeholder.com/800x600/99DDFF/FFFFFF?text=Detail+3',
    'https://via.placeholder.com/800x600/CCEEFF/FFFFFF?text=Detail+4'
  ];

  const displayImages = images.length > 0 ? images : defaultImages;

  return (
    <div className="w-full">
      {/* 데스크톱 레이아웃 */}
      <div className="hidden md:flex gap-4">
        {/* 메인 이미지 (좌측) */}
        <div className="flex-1 relative aspect-[4/3] rounded-3xl overflow-hidden glass-card">
          <img
            src={displayImages[selectedImage]}
            alt={`${productTitle} - 이미지 ${selectedImage + 1}`}
            className="w-full h-full object-cover"
          />
          
          {/* 찜하기 버튼 */}
          {onLikeClick && (
            <button
              onClick={onLikeClick}
              className="absolute top-4 right-4 p-3 rounded-2xl glass-action-button-new bg-white/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110"
            >
              <svg
                className="w-6 h-6"
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

        {/* 썸네일 갤러리 (우측) */}
        <div className="flex flex-col space-y-3">
          {displayImages.map((image, index) => (
            <button
              key={index}
              onClick={() => setSelectedImage(index)}
              className={`flex-shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden transition-all duration-200 ${
                selectedImage === index
                  ? 'ring-4 ring-blue-500 ring-offset-2'
                  : 'hover:ring-2 ring-gray-300'
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
      </div>

      {/* 모바일 레이아웃 */}
      <div className="md:hidden">
        {/* 메인 이미지 */}
        <div className="relative aspect-[4/3] rounded-3xl overflow-hidden glass-card mb-4">
          <img
            src={displayImages[selectedImage]}
            alt={`${productTitle} - 이미지 ${selectedImage + 1}`}
            className="w-full h-full object-cover"
          />
          
          {/* 찜하기 버튼 */}
          {onLikeClick && (
            <button
              onClick={onLikeClick}
              className="absolute top-4 right-4 p-3 rounded-2xl glass-action-button-new bg-white/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110"
            >
              <svg
                className="w-6 h-6"
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

        {/* 썸네일 갤러리 (하단) */}
        <div className="flex gap-3 overflow-x-auto pb-2">
          {displayImages.map((image, index) => (
            <button
              key={index}
              onClick={() => setSelectedImage(index)}
              className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden transition-all duration-200 ${
                selectedImage === index
                  ? 'ring-4 ring-blue-500 ring-offset-2'
                  : 'hover:ring-2 ring-gray-300'
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
      </div>
    </div>
  );
};

export default ImageGallery;
