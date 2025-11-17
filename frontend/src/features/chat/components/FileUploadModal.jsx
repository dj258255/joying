/**
 * FileUploadModal Component
 * 파일 업로드 모달 컴포넌트 (카카오톡 스타일)
 */

import React, { useState, useRef } from 'react';

const FileUploadModal = ({ isOpen, onClose, onFileSelect }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
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

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (files) => {
    // 파일 검증
    const validFiles = [];

    for (const file of files) {
      // ContentType 기반으로 이미지 여부 판단
      const isImage = file.type && file.type.startsWith('image/');
      const maxSize = isImage ? 10 * 1024 * 1024 : 50 * 1024 * 1024;

      if (file.size > maxSize) {
        alert(`${file.name}: ${isImage
          ? '이미지 파일 크기는 10MB 이하여야 합니다.'
          : '파일 크기는 50MB 이하여야 합니다.'}`);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setSelectedFiles(validFiles);
    }
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    // 여러 파일을 순차적으로 업로드
    for (const file of selectedFiles) {
      await onFileSelect(file);
    }

    setSelectedFiles([]);
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
              이미지/영상을 드래그하거나 클릭하여 업로드
            </h3>
            <p className="text-sm text-white/70 mb-4">
              이미지: 최대 10MB, 영상: 최대 50MB
            </p>
            
            <button
              onClick={handleButtonClick}
              className="px-6 py-3 bg-black/40 backdrop-blur-md text-white rounded-xl font-semibold hover:bg-black/60 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 border border-white/20"
            >
              파일 선택
            </button>
          </div>

          {/* 선택된 파일 목록 */}
          {selectedFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-white/80 font-medium">
                  선택된 파일 ({selectedFiles.length}개)
                </p>
                <button
                  onClick={() => setSelectedFiles([])}
                  className="text-xs text-white/60 hover:text-white/90 transition-colors"
                >
                  전체 삭제
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-white/10 backdrop-blur-md rounded-lg p-3 border border-white/20"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        {file.type.startsWith('image/') ? (
                          <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-white/60">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="flex-shrink-0 ml-2 p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                    >
                      <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              {/* 업로드 버튼 */}
              <button
                onClick={handleUpload}
                className="w-full mt-4 px-6 py-3 bg-black/60 backdrop-blur-md text-white rounded-xl font-semibold hover:bg-black/80 transition-all duration-200 shadow-lg hover:shadow-xl border border-white/20"
              >
                업로드 ({selectedFiles.length}개)
              </button>
            </div>
          )}

          {/* 숨겨진 파일 입력 */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleFileInput}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
};

export default FileUploadModal;
