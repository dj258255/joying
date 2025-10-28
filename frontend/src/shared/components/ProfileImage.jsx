/**
 * ProfileImage Component
 * 프로필 이미지 컴포넌트 (기본 이미지 포함)
 */

import React, { useState } from 'react';
import DefaultAvatar from './DefaultAvatar';

const ProfileImage = ({ 
  src, 
  alt = '프로필', 
  size = 40, 
  className = '',
  fallbackToDefault = true,
  onClick
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  // 이미지가 없거나 에러가 발생한 경우 기본 아바타 표시
  if (!src || imageError || !fallbackToDefault) {
    return <DefaultAvatar size={size} className={className} onClick={onClick} />;
  }

  return (
    <div 
      className={`relative ${className}`} 
      style={{ width: size, height: size }}
      onClick={onClick}
    >
      {imageLoading && (
        <div className="absolute inset-0 bg-gray-300 rounded-full animate-pulse" />
      )}
      <img
        src={src}
        alt={alt}
        className="w-full h-full rounded-full object-cover"
        onError={handleImageError}
        onLoad={handleImageLoad}
        style={{ display: imageLoading ? 'none' : 'block' }}
      />
    </div>
  );
};

export default ProfileImage;
