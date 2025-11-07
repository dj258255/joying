/**
 * ImageGallery Component
 * 상품 이미지 갤러리 컴포넌트
 */

import React, { useState } from 'react';

const ImageGallery = ({ images = [], productTitle = '', isLiked = false, onLikeClick, compact = false }) => {
  const [selectedImage, setSelectedImage] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [showMagnifier, setShowMagnifier] = useState(false);
  const [magnifierPosition, setMagnifierPosition] = useState({ x: 0, y: 0 });

  const defaultImages = [
    'https://via.placeholder.com/800x800/E5E7EB/9CA3AF?text=Product+Image',
    'https://via.placeholder.com/800x800/E5E7EB/9CA3AF?text=Detail+1',
    'https://via.placeholder.com/800x800/E5E7EB/9CA3AF?text=Detail+2',
    'https://via.placeholder.com/800x800/E5E7EB/9CA3AF?text=Detail+3'
  ];

  const displayImages = images.length > 0 ? images : defaultImages;

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMagnifierPosition({ x, y });
  };

  return (
    <div className={compact ? "" : "space-y-4"}>
      {compact ? (
        /* Compact 모드: 왼쪽에 대표 이미지, 오른쪽에 서브 이미지 */
        <div className="flex gap-2">
          {/* 왼쪽: 대표 이미지 (정사각형, 작은 크기) */}
          <div 
            className="relative w-32 h-32 flex-shrink-0 bg-gray-100 rounded-xl overflow-hidden cursor-pointer"
            onClick={() => setIsZoomed(true)}
          >
            <img
              src={displayImages[selectedImage]}
              alt={`${productTitle} - 이미지 ${selectedImage + 1}`}
              className="w-full h-full object-cover"
            />
          </div>
          
          {/* 오른쪽: 서브 이미지들 (2x2 그리드) */}
          {displayImages.length > 1 && (
            <div className="grid grid-cols-2 gap-2">
              {displayImages.slice(0, 4).map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`relative w-14 h-14 rounded-lg overflow-hidden transition-all duration-200 ${
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
      ) : (
        /* 일반 모드: 기존 레이아웃 */
        <>
          {/* 메인 이미지 */}
          <div 
            className="relative w-full aspect-[4/3] bg-gray-100 rounded-2xl overflow-hidden max-h-[600px] cursor-crosshair group"
            onMouseEnter={() => setShowMagnifier(true)}
            onMouseLeave={() => setShowMagnifier(false)}
            onMouseMove={handleMouseMove}
            onClick={() => setIsZoomed(true)}
          >
            <img
              src={displayImages[selectedImage]}
              alt={`${productTitle} - 이미지 ${selectedImage + 1}`}
              className="w-full h-full object-cover"
            />
            
            {/* 마우스 호버 시 확대된 부분 표시 */}
            {showMagnifier && (
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: `url(${displayImages[selectedImage]})`,
                  backgroundSize: '200%',
                  backgroundPosition: `${magnifierPosition.x}% ${magnifierPosition.y}%`,
                  backgroundRepeat: 'no-repeat'
                }}
              />
            )}
            
            {/* 찜하기 버튼 */}
            {onLikeClick && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onLikeClick();
                }}
                className="absolute top-4 right-4 p-3 rounded-xl bg-white/90 backdrop-blur-sm shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 z-[5]"
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
        </>
      )}

      {/* 확대 모달 */}
      {!compact && isZoomed && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setIsZoomed(false)}
        >
          {/* 닫기 버튼 */}
          <button
            onClick={() => setIsZoomed(false)}
            className="absolute top-4 right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-colors z-10"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* 확대된 이미지 */}
          <img
            src={displayImages[selectedImage]}
            alt={`${productTitle} - 확대 이미지`}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {/* 이미지 네비게이션 (여러 이미지가 있을 경우) */}
          {displayImages.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImage((prev) => (prev > 0 ? prev - 1 : displayImages.length - 1));
                }}
                className="absolute left-4 p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-colors"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImage((prev) => (prev < displayImages.length - 1 ? prev + 1 : 0));
                }}
                className="absolute right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-colors"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageGallery;
