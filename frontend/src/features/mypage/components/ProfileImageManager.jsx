/**
 * ProfileImageManager Component
 * 프로필 이미지 관리 컴포넌트
 */

import React, { useState } from 'react';

const ProfileImageManager = () => {
  const [currentImage, setCurrentImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // 파일 크기 체크 (5MB 제한)
      if (file.size > 5 * 1024 * 1024) {
        alert('파일 크기는 5MB 이하여야 합니다.');
        return;
      }

      // 이미지 파일 체크
      if (!file.type.startsWith('image/')) {
        alert('이미지 파일만 업로드 가능합니다.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!previewImage) {
      alert('이미지를 선택해주세요.');
      return;
    }

    setIsLoading(true);
    
    // 실제 API 호출 시뮬레이션
    setTimeout(() => {
      setCurrentImage(previewImage);
      setPreviewImage(null);
      setIsLoading(false);
      alert('프로필 이미지가 업로드되었습니다.');
    }, 1000);
  };

  const handleDelete = async () => {
    if (!window.confirm('프로필 이미지를 삭제하시겠습니까?')) {
      return;
    }

    setIsLoading(true);
    
    // 실제 API 호출 시뮬레이션
    setTimeout(() => {
      setCurrentImage(null);
      setPreviewImage(null);
      setIsLoading(false);
      alert('프로필 이미지가 삭제되었습니다.');
    }, 1000);
  };

  const handleCancel = () => {
    setPreviewImage(null);
    // 파일 입력 초기화
    const fileInput = document.getElementById('profile-image-input');
    if (fileInput) {
      fileInput.value = '';
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
                    accept="image/*"
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
                  JPG, PNG, GIF 파일만 가능 (최대 5MB)
                </p>
              </div>

              {/* 액션 버튼들 */}
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                {previewImage && (
                  <button
                    onClick={handleUpload}
                    disabled={isLoading}
                    className="glass-button-success flex-1 py-3 px-6 font-semibold disabled:opacity-50"
                  >
                    {isLoading ? '업로드 중...' : '이미지 업로드'}
                  </button>
                )}
                {currentImage && (
                  <button
                    onClick={handleDelete}
                    disabled={isLoading}
                    className="glass-button-danger flex-1 py-3 px-6 font-semibold disabled:opacity-50"
                  >
                    {isLoading ? '삭제 중...' : '이미지 삭제'}
                  </button>
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
