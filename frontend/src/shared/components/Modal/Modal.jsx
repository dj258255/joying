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
      <div className="flex min-h-full items-center justify-center p-2 md:p-4">
        <div className={`relative glass-modal-fullscreen max-w-md w-full max-h-[90vh] md:max-h-[85vh] flex flex-col overflow-hidden ${className}`} onClick={(e) => e.stopPropagation()}>          {/* 내용 - 스크롤 가능 (데스크톱에서) */}
          <div className="flex-1 overflow-y-auto scrollbar-hide p-1 md:p-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
