/**
 * ProfileImageUploader Component
 * 프로필 이미지 업로드 컴포넌트
 */

import React, { useState } from 'react';
import { useProfileImage } from '../hooks/useProfileImage';

/**
 * @param {Object} props
 * @param {string} props.currentImageUrl - 현재 프로필 이미지 URL
 * @param {Function} props.onImageChange - 이미지 변경 콜백
 */
const ProfileImageUploader = ({ currentImageUrl, onImageChange }) => {
  const [previewUrl, setPreviewUrl] = useState(currentImageUrl);
  const { uploadImage, deleteImage, isLoading } = useProfileImage();

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setPreviewUrl(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    const fileInput = document.getElementById('profile-image-input');
    const file = fileInput.files[0];
    
    if (file) {
      try {
        const result = await uploadImage(file);
        onImageChange?.(result.imageUrl);
      } catch (error) {
        console.error('이미지 업로드 실패:', error);
      }
    }
  };

  const handleDelete = async () => {
    try {
      await deleteImage();
      setPreviewUrl(null);
      onImageChange?.(null);
    } catch (error) {
      console.error('이미지 삭제 실패:', error);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="프로필 이미지"
            className="w-32 h-32 rounded-full object-cover"
          />
        ) : (
          <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-gray-500">이미지 없음</span>
          </div>
        )}
      </div>
      
      <div className="flex space-x-2">
        <input
          id="profile-image-input"
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <label
          htmlFor="profile-image-input"
          className="px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600"
        >
          이미지 선택
        </label>
        <button
          onClick={handleUpload}
          disabled={isLoading}
          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
        >
          {isLoading ? '업로드 중...' : '업로드'}
        </button>
        {previewUrl && (
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            삭제
          </button>
        )}
      </div>
    </div>
  );
};

export default ProfileImageUploader;
