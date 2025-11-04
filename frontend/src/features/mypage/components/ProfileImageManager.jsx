/**
 * ProfileImageManager Component
 * 프로필 이미지 관리 컴포넌트
 */

import React, { useState } from 'react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useUserProfile } from '@/features/user/hooks/useUserProfile';

const ProfileImageManager = () => {
  const { user: currentUser } = useAuth();
  const memberId = currentUser?.memberId || currentUser?.id;
  
  const { user, updateProfileImage, deleteProfileImage, isUploadingImage, isDeletingImage } = useUserProfile(memberId);
  const [previewImage, setPreviewImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState(null);

  // user 정보가 업데이트되면 현재 이미지도 업데이트
  const currentImage = user?.profileImageUrl || null;

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
      reader.onload = (e) => {
        setPreviewImage(e.target.result);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError(err.message);
      setSelectedFile(null);
      setPreviewImage(null);
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
      await updateProfileImage(selectedFile);
      
      // 업로드 성공 시 파일 선택 초기화
      const fileInput = document.getElementById('profile-image-input');
      if (fileInput) {
        fileInput.value = '';
      }
      setSelectedFile(null);
      setPreviewImage(null);
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || '이미지 업로드에 실패했습니다.';
      setError(errorMessage);
      console.error('이미지 업로드 실패:', error);
    }
  };

  const handleCancel = () => {
    setPreviewImage(null);
    setSelectedFile(null);
    setError(null);
    // 파일 입력 초기화
    const fileInput = document.getElementById('profile-image-input');
    if (fileInput) {
      fileInput.value = '';
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
      await deleteProfileImage();
      
      // 삭제 성공 시 미리보기 초기화
      setPreviewImage(null);
      setSelectedFile(null);
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || '이미지 삭제에 실패했습니다.';
      setError(errorMessage);
      console.error('이미지 삭제 실패:', error);
    }
  };

  return (
    <div className="glass-modal-content p-6">
      <div className="mb-6">
        <h2 className="glass-modal-title">프로필 이미지 관리</h2>
        <p className="glass-modal-description">프로필 이미지를 등록, 변경, 삭제하세요</p>
      </div>

      <div className="glass-profile-container p-6">
        <div className="flex flex-col lg:flex-row items-start space-y-6 lg:space-y-0 lg:space-x-8">
          {/* 이미지 미리보기 */}
          <div className="flex-shrink-0">
            <div className="relative">
              <div className="glass-profile-image-container w-32 h-32 lg:w-40 lg:h-40 rounded-full overflow-hidden">
                {previewImage ? (
                  <img
                    src={previewImage}
                    alt="미리보기"
                    className="w-full h-full object-cover"
                  />
                ) : currentImage ? (
                  <img
                    src={currentImage}
                    alt="현재 프로필"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="glass-profile-placeholder w-full h-full flex items-center justify-center">
                    <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              {previewImage && (
                <div className="glass-preview-badge absolute -top-2 -right-2 text-white text-xs px-2 py-1 rounded-full">
                  미리보기
                </div>
              )}
            </div>
          </div>

          {/* 컨트롤 영역 */}
          <div className="flex-1 min-w-0">
            <div className="space-y-4">
              {/* 파일 선택 */}
              <div>
                <label className="glass-form-label block text-sm font-medium mb-2">
                  이미지 선택
                </label>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                  <input
                    id="profile-image-input"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/gif"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <label
                    htmlFor="profile-image-input"
                    className="glass-button-primary flex-1 py-3 px-6 cursor-pointer text-center font-semibold inline-block w-full"
                  >
                    이미지 선택
                  </label>
                  {previewImage && (
                    <button
                      onClick={handleCancel}
                      className="glass-button-ghost flex-1 py-3 px-6 font-semibold inline-block w-full text-center"
                    >
                      취소
                    </button>
                  )}
                </div>
                <p className="glass-form-help text-xs mt-1">
                  PNG, JPEG, JPG, GIF 파일만 가능 (최대 10MB)
                </p>
              </div>

              {error && (
                <div className="glass-error-message text-red-500 text-sm p-3 bg-red-50 rounded">
                  {error}
                </div>
              )}

              {/* 액션 버튼들 */}
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                {previewImage ? (
                  <>
                    <button
                      onClick={handleUpload}
                      disabled={isUploadingImage || isDeletingImage}
                      className="glass-button-success flex-1 py-3 px-6 font-semibold disabled:opacity-50"
                    >
                      {isUploadingImage ? '업로드 중...' : '이미지 업로드'}
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={isUploadingImage || isDeletingImage}
                      className="glass-button-ghost flex-1 py-3 px-6 font-semibold disabled:opacity-50"
                    >
                      취소
                    </button>
                  </>
                ) : (
                  currentImage && user?.profileImageId && (
                    <button
                      onClick={handleDelete}
                      disabled={isUploadingImage || isDeletingImage}
                      className="glass-button-danger flex-1 py-3 px-6 font-semibold disabled:opacity-50"
                    >
                      {isDeletingImage ? '삭제 중...' : '이미지 삭제'}
                    </button>
                  )
                )}
              </div>

              {/* 가이드라인 */}
              <div className="glass-guideline-container p-4">
                <h4 className="glass-guideline-title text-sm font-medium mb-2">이미지 가이드라인</h4>
                <ul className="glass-guideline-list text-xs space-y-1">
                  <li>• 정사각형 이미지를 권장합니다</li>
                  <li>• 최소 200x200px 이상의 해상도를 권장합니다</li>
                  <li>• 개인정보가 포함된 이미지는 피해주세요</li>
                  <li>• 부적절한 이미지는 관리자에 의해 삭제될 수 있습니다</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileImageManager;
