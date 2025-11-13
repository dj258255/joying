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
 * @param {string} props.title - 모달 제목
 * @param {string} props.className - 추가 CSS 클래스
 */
const Modal = ({
  isOpen,
  onClose,
  children,
  title,
  className = ''
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
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* 배경 오버레이 - 글래스모피즘 */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* 모달 컨테이너 */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className={`relative glass-modal-fullscreen max-w-md w-full ${className}`}>
          {/* 헤더 */}
          {title && (
            <div className="glass-modal-header flex items-center justify-between p-6 border-b border-white/20">
              <h3 className="text-lg font-semibold text-gray-900">
                {title}
              </h3>
              <button
                onClick={onClose}
                className="glass-modal-close text-gray-600 hover:text-gray-900"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          
          {/* 내용 */}
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
