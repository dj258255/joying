/**
 * ProfileImageUploader Component
 * 프로필 이미지 업로드 컴포넌트
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useUserProfile } from '../hooks/useUserProfile';

/**
 * @param {Object} props
 * @param {string} [props.currentImageUrl] - 현재 프로필 이미지 URL (useUserProfile에서 자동으로 가져옴)
 * @param {Function} [props.onImageChange] - 이미지 변경 콜백
 * @param {number} [props.memberId] - 회원 ID (없으면 현재 로그인한 사용자 사용)
 */
const ProfileImageUploader = ({ currentImageUrl, onImageChange, memberId: propMemberId }) => {
  const { user: currentUser } = useAuth();
  const memberId = propMemberId || currentUser?.memberId || currentUser?.id;
  
  const { user, updateProfileImage, deleteProfileImage, isUploadingImage, isDeletingImage } = useUserProfile(memberId);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState(null);

  // user 정보가 업데이트되면 previewUrl도 업데이트
  useEffect(() => {
    if (currentImageUrl || user?.profileImageUrl) {
      setPreviewUrl(currentImageUrl || user?.profileImageUrl);
    }
  }, [currentImageUrl, user?.profileImageUrl]);

  const validateFile = (file) => {
    // 파일 형식 검증 (image/png, image/jpeg, image/jpg, image/gif)
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('이미지 파일만 업로드 가능합니다. (PNG, JPEG, JPG, GIF)');
    }

    // 파일 크기 검증 (최대 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('파일 크기는 10MB 이하여야 합니다.');
    }

    return true;
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      validateFile(file);
      setError(null);
      setSelectedFile(file);
      
      // 미리보기 생성
      const reader = new FileReader();
      reader.onload = (e) => setPreviewUrl(e.target.result);
      reader.readAsDataURL(file);
    } catch (err) {
      setError(err.message);
      setSelectedFile(null);
      setPreviewUrl(null);
      // 파일 입력 초기화
      event.target.value = '';
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('이미지를 선택해주세요.');
      return;
    }

    if (!memberId) {
      setError('회원 정보를 찾을 수 없습니다.');
      return;
    }

    try {
      setError(null);
      const result = await updateProfileImage(selectedFile);
      
      // 업로드 성공 시 파일 선택 초기화
      const fileInput = document.getElementById('profile-image-input');
      if (fileInput) {
        fileInput.value = '';
      }
      setSelectedFile(null);
      
      // 콜백 호출
      onImageChange?.(result.profileImageUrl);
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || '이미지 업로드에 실패했습니다.';
      setError(errorMessage);
      console.error('이미지 업로드 실패:', error);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('프로필 이미지를 삭제하시겠습니까?')) {
      return;
    }

    if (!memberId) {
      setError('회원 정보를 찾을 수 없습니다.');
      return;
    }

    try {
      setError(null);
      const result = await deleteProfileImage();
      
      // 삭제 성공 시 미리보기 초기화
      setPreviewUrl(result.profileImageUrl || null);
      setSelectedFile(null);
      
      // 콜백 호출
      onImageChange?.(result.profileImageUrl);
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || '이미지 삭제에 실패했습니다.';
      setError(errorMessage);
      console.error('이미지 삭제 실패:', error);
    }
  };

  if (!memberId) {
    return (
      <div className="flex flex-col items-center space-y-4">
        <div className="text-red-500 text-sm">로그인이 필요합니다.</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="프로필 이미지"
            className="w-32 h-32 rounded-full object-cover border-2 border-gray-300"
          />
        ) : (
          <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
            <span className="text-gray-500 text-sm">이미지 없음</span>
          </div>
        )}
      </div>

      {error && (
        <div className="text-red-500 text-sm text-center max-w-xs">
          {error}
        </div>
      )}
      
      <div className="flex flex-col items-center space-y-2">
        <div className="flex space-x-2">
          <input
            id="profile-image-input"
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/gif"
            onChange={handleFileSelect}
            className="hidden"
          />
          <label
            htmlFor="profile-image-input"
            className="px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600 transition-colors"
          >
            이미지 선택
          </label>
          {selectedFile && (
            <button
              onClick={handleUpload}
              disabled={isUploadingImage || isDeletingImage}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
            >
              {isUploadingImage ? '업로드 중...' : '업로드'}
            </button>
          )}
          {!selectedFile && user?.profileImageUrl && user?.profileImageId && (
            <button
              onClick={handleDelete}
              disabled={isUploadingImage || isDeletingImage}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              {isDeletingImage ? '삭제 중...' : '이미지 삭제'}
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500 text-center">
          PNG, JPEG, JPG, GIF 파일만 가능 (최대 10MB)
        </p>
      </div>
    </div>
  );
};

export default ProfileImageUploader;
