/**
 * ProfileImageManager Component
 * 프로필 이미지 관리 컴포넌트
 */

import React, { useState } from 'react';

const ProfileImageManager = () => {
  const [currentImage, setCurrentImage] = useState('https://via.placeholder.com/150x150/4F46E5/FFFFFF?text=김대여');
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
    <div className="p-4 lg:p-6">
      <div className="mb-4 lg:mb-6">
        <h2 className="text-xl lg:text-2xl font-bold text-gray-900">프로필 이미지 관리</h2>
        <p className="text-gray-600 mt-1 text-sm lg:text-base">프로필 이미지를 등록, 변경, 삭제하세요</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 lg:p-6">
        <div className="flex flex-col lg:flex-row items-start space-y-6 lg:space-y-0 lg:space-x-8">
          {/* 이미지 미리보기 */}
          <div className="flex-shrink-0">
            <div className="relative">
              <div className="w-32 h-32 lg:w-40 lg:h-40 rounded-full overflow-hidden border-2 border-gray-200">
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
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              {previewImage && (
                <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 cursor-pointer transition-colors text-center"
                  >
                    이미지 선택
                  </label>
                  {previewImage && (
                    <button
                      onClick={handleCancel}
                      className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      취소
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  JPG, PNG, GIF 파일만 가능 (최대 5MB)
                </p>
              </div>

              {/* 액션 버튼들 */}
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                {previewImage && (
                  <button
                    onClick={handleUpload}
                    disabled={isLoading}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {isLoading ? '업로드 중...' : '이미지 업로드'}
                  </button>
                )}
                {currentImage && (
                  <button
                    onClick={handleDelete}
                    disabled={isLoading}
                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {isLoading ? '삭제 중...' : '이미지 삭제'}
                  </button>
                )}
              </div>

              {/* 가이드라인 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">이미지 가이드라인</h4>
                <ul className="text-xs text-gray-600 space-y-1">
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
