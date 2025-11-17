/**
 * DeleteMessageModal Component
 * 메시지 삭제 확인 모달 컴포넌트 (카카오톡 스타일)
 */

import React from 'react';

const DeleteMessageModal = ({ isOpen, onClose, onConfirm, messageContent }) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 배경 오버레이 */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* 모달 컨텐츠 */}
      <div className="relative w-full max-w-sm bg-white/90 backdrop-blur-lg border border-white/20 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300">
        {/* 헤더 */}
        <div className="flex items-center justify-center p-6 border-b border-gray-200/50">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
        </div>

        {/* 본문 */}
        <div className="p-6 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            메시지 삭제
          </h3>
          <p className="text-sm text-gray-600 mb-1">
            이 메시지를 삭제하시겠습니까?
          </p>
          {messageContent && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-500 text-left line-clamp-2">
                {messageContent}
              </p>
            </div>
          )}
          <p className="text-xs text-gray-500 mt-3">
            삭제된 메시지는 상대방에게도 표시되지 않습니다.
          </p>
        </div>

        {/* 버튼 영역 */}
        <div className="p-6 pt-0 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all duration-200 hover:scale-105"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-medium hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteMessageModal;





