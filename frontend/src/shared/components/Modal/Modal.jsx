/**
 * Modal Component
 * 재사용 가능한 모달 컴포넌트
 */

import React, { useEffect } from 'react';

/**
 * @param {Object} props
 * @param {boolean} props.isOpen - 모달 열림 상태
 * @param {Function} props.onClose - 모달 닫기 핸들러
 * @param {React.ReactNode} props.children - 모달 내용
 * @param {string} [props.title] - 모달 제목 (선택적)
 * @param {string} [props.className] - 추가 CSS 클래스
 * @param {boolean} [props.hideCloseButton] - 닫기 버튼 숨기기 (거래 모달용)
 */
const Modal = ({
  isOpen,
  onClose,
  children,
  title,
  className = '',
  hideCloseButton = false
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4">
      {/* 배경 오버레이 - 글래스모피즘 */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />
      
      {/* 모달 컨테이너 */}
      <div 
        className={`relative bg-white/90 backdrop-blur-xl border border-white/40 rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] md:max-h-[85vh] flex flex-col overflow-hidden ${className}`} 
        onClick={(e) => e.stopPropagation()}
      >
        {/* 커스텀 닫기 버튼 */}
        {title && (
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/30">
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            {!hideCloseButton && (
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-white/40 hover:bg-white/60 text-gray-900 transition-all duration-300 hover:scale-110"
                aria-label="닫기"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
        {!title && !hideCloseButton && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-xl bg-white/40 hover:bg-white/60 text-gray-900 transition-all duration-300 hover:scale-110"
            aria-label="닫기"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        
        {/* 내용 - 스크롤 가능 */}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
