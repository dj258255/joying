/**
 * EmoticonPicker Component
 * 이모티콘 선택 컴포넌트 (로딩 최적화 포함)
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';

// 이모티콘 이미지들을 동적으로 import (Vite의 import.meta.glob 사용)
const emoticonModules = import.meta.glob('@/assets/imoticon/*.{png,jpg,jpeg,gif}', { 
  eager: true,
  import: 'default'
});

// 이모티콘 이미지 목록 생성
const EMOTICON_IMAGES = Object.entries(emoticonModules)
  .map(([path, module], index) => {
    // 파일명에서 확장자 제거하여 alt 텍스트 생성
    const fileName = path.split('/').pop().replace(/\.[^/.]+$/, '');
    // 파일명 정리 (특수문자 제거, 공백을 언더스코어로 변경)
    const cleanFileName = fileName
      .replace(/[()]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    return {
      id: `emoticon-${index + 1}`,
      src: module,
      alt: cleanFileName || `이모티콘 ${index + 1}`,
      fileName: fileName
    };
  })
  .sort((a, b) => {
    // 파일명으로 정렬 (일관된 순서)
    return a.alt.localeCompare(b.alt, 'ko', { numeric: true });
  });

/**
 * 이미지를 Data URL로 변환 (Base64 인코딩)
 */
const imageToDataURL = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        // 이미지 크기 조정 (최적화: 최대 512px)
        const maxSize = 512;
        let width = img.width;
        let height = img.height;
        
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height / width) * maxSize;
            width = maxSize;
          } else {
            width = (width / height) * maxSize;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        // 투명 배경 유지 (PNG 사용)
        // 투명 배경을 흰색으로 채우지 않고 그대로 유지
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        
        // PNG로 변환하여 투명도 유지 (품질 최적화는 PNG에서는 적용되지 않음)
        const dataURL = canvas.toDataURL('image/png');
        resolve(dataURL);
      } catch (error) {
        reject(error);
      }
    };
    img.onerror = reject;
    img.src = src;
  });
};

/**
 * Lazy loading 이미지 컴포넌트
 */
const LazyEmoticonImage = ({ emoticon, onSelect, index }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef(null);
  const observerRef = useRef(null);

  useEffect(() => {
    // Intersection Observer를 사용한 lazy loading
    if (typeof IntersectionObserver !== 'undefined') {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setIsVisible(true);
              observerRef.current?.unobserve(entry.target);
            }
          });
        },
        { rootMargin: '50px' }
      );

      if (imgRef.current) {
        observerRef.current.observe(imgRef.current);
      }
    } else {
      // Intersection Observer를 지원하지 않는 경우 즉시 로드
      setIsVisible(true);
    }

    return () => {
      if (observerRef.current && imgRef.current) {
        observerRef.current.unobserve(imgRef.current);
      }
    };
  }, []);

  const handleClick = useCallback(async () => {
    if (!isLoaded) return;
    
    try {
      // 이미지를 Data URL로 변환 (Base64 인코딩)
      const dataURL = await imageToDataURL(emoticon.src);
      onSelect(dataURL);
    } catch (error) {
      
      alert('이모티콘을 선택할 수 없습니다.');
    }
  }, [emoticon, isLoaded, onSelect]);

  return (
    <button
      ref={imgRef}
      onClick={handleClick}
      disabled={!isLoaded}
      className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center rounded-lg hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group bg-transparent"
      aria-label={emoticon.alt}
      style={{ backgroundColor: 'transparent' }}
    >
      {isVisible ? (
        <>
          {!isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-transparent">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            </div>
          )}
          <img
            src={emoticon.src}
            alt={emoticon.alt}
            onLoad={() => setIsLoaded(true)}
            onError={() => {
              
              setIsLoaded(false);
            }}
            className={`w-full h-full object-contain transition-opacity duration-200 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            } group-hover:scale-110`}
            style={{ backgroundColor: 'transparent' }}
            loading="lazy"
            decoding="async"
          />
        </>
      ) : (
        <div className="w-full h-full bg-transparent rounded-lg animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin" />
        </div>
      )}
    </button>
  );
};

/**
 * EmoticonPicker 컴포넌트
 */
const EmoticonPicker = ({ isOpen, onClose, onSelect }) => {
  const modalRef = useRef(null);

  // 검색 기능 제거 - 모든 이모티콘 표시
  const filteredEmoticons = EMOTICON_IMAGES;

  // 모달 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // ESC 키로 닫기
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  const handleSelect = useCallback(async (dataURL) => {
    try {
      await onSelect(dataURL);
      onClose();
    } catch (error) {
      
    }
  }, [onSelect, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* 배경 오버레이 */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* 모달 컨텐츠 */}
      <div 
        ref={modalRef}
        className="relative w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-300 max-h-[80vh] flex flex-col"
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">이모티콘</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="닫기"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 이모티콘 그리드 */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-transparent">
          {filteredEmoticons.length > 0 ? (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 sm:gap-4">
              {filteredEmoticons.map((emoticon, index) => (
                <LazyEmoticonImage
                  key={emoticon.id}
                  emoticon={emoticon}
                  onSelect={handleSelect}
                  index={index}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default EmoticonPicker;

