/**
 * FileUploadModal Component
 * 파일 업로드 모달 컴포넌트 (카카오톡 스타일)
 */

import React, { useState, useRef } from 'react';

const FileUploadModal = ({ isOpen, onClose, onFileSelect }) => {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file) => {
    // 파일 타입 검증은 백엔드에서 자동으로 처리되므로
    // 여기서는 기본적인 검증만 수행
    // 이미지: 10MB, 일반 파일: 50MB 제한은 백엔드에서 처리
    
    // ContentType 기반으로 이미지 여부 판단
    const isImage = file.type && file.type.startsWith('image/');
    const maxSize = isImage ? 10 * 1024 * 1024 : 50 * 1024 * 1024;

    if (file.size > maxSize) {
      alert(isImage 
        ? '이미지 파일 크기는 10MB 이하여야 합니다.' 
        : '파일 크기는 50MB 이하여야 합니다.');
      return;
    }

    onFileSelect(file);
    onClose();
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 배경 오버레이 */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />
      
      {/* 모달 컨텐츠 - 글래스모피즘 스타일 */}
      <div className="relative w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white">파일 업로드</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-200 hover:scale-105 backdrop-blur-sm"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 업로드 영역 */}
        <div className="p-6">
          <div
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${
              dragActive 
                ? 'border-white/60 bg-white/20 backdrop-blur-md' 
                : 'border-white/30 bg-white/5 hover:border-white/40 hover:bg-white/10 backdrop-blur-sm'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-4 border border-white/20">
              <svg className="w-8 h-8 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            
            <h3 className="text-lg font-medium text-white mb-2">
              파일을 드래그하거나 클릭하여 업로드
            </h3>
            <p className="text-sm text-white/70 mb-4">
              이미지: 최대 10MB, 일반 파일: 최대 50MB
            </p>
            
            <button
              onClick={handleButtonClick}
              className="px-6 py-3 bg-black/40 backdrop-blur-md text-white rounded-xl font-semibold hover:bg-black/60 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 border border-white/20"
            >
              파일 선택
            </button>
          </div>

          {/* 숨겨진 파일 입력 */}
          <input
            ref={fileInputRef}
            type="file"
            accept="*/*"
            onChange={handleFileInput}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
};

export default FileUploadModal;
