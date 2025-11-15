/**
 * MessageInput Component
 * 메시지 입력 컴포넌트 (카카오톡 스타일)
 */

import React, { useState, useRef } from 'react';
import FileUploadModal from './FileUploadModal';
import EmoticonPicker from './EmoticonPicker';

/**
 * @param {Object} props
 * @param {Function} props.onSendMessage - 메시지 전송 핸들러
 * @param {Function} props.onSendFile - 파일 전송 핸들러
 * @param {Function} props.onTyping - 타이핑 이벤트 전송 핸들러
 * @param {boolean} props.disabled - 입력 비활성화 여부
 * @param {Object} props.replyTo - 답장할 메시지
 * @param {Function} props.onCancelReply - 답장 취소 핸들러
 * @param {Object} props.previewMessage - 미리보기 메시지 (하단이 아닐 때 상대방 메시지)
 * @param {Function} props.onPreviewClick - 미리보기 클릭 핸들러
 */
const MessageInput = ({
  onSendMessage,
  onSendFile,
  onTyping,
  disabled = false,
  replyTo = null,
  onCancelReply,
  previewMessage = null,
  onPreviewClick = null
}) => {
  const [message, setMessage] = useState('');
  const [showFileModal, setShowFileModal] = useState(false);
  const [showEmoticonPicker, setShowEmoticonPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef(null);
  const dropZoneRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const lastTypingTimeRef = useRef(0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      // replyTo가 객체인 경우 id를, 문자열인 경우 그대로 사용
      let replyToMessageId = null;
      if (replyTo) {
        if (typeof replyTo === 'object' && replyTo !== null) {
          replyToMessageId = replyTo.id || replyTo.replyToMessageId || null;
        } else if (typeof replyTo === 'string') {
          replyToMessageId = replyTo;
        }
      }
      
      onSendMessage({
        content: message.trim(),
        type: 'TEXT',
        replyToMessageId: replyToMessageId
      });
      setMessage('');
      onCancelReply?.();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileSelect = async (file) => {
    if (disabled) {
      return;
    }
    try {
      await onSendFile?.(file);
    } catch (error) {
      console.error('파일 전송 실패:', error);
      alert(error.message || '파일 전송에 실패했습니다.');
    }
  };

  // 이모티콘 선택 핸들러 (Data URL을 이미지로 전송)
  const handleEmoticonSelect = async (dataURL) => {
    if (disabled) {
      return;
    }
    try {
      // Data URL을 Blob으로 변환
      const response = await fetch(dataURL);
      const blob = await response.blob();
      
      // Blob을 File 객체로 변환
      const file = new File([blob], `emoticon-${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      // 파일로 전송
      await onSendFile?.(file);
      setShowEmoticonPicker(false);
    } catch (error) {
      console.error('이모티콘 전송 실패:', error);
      alert(error.message || '이모티콘 전송에 실패했습니다.');
    }
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  };

  // 타이핑 이벤트 전송 (디바운싱: 1초마다 최대 1회)
  const handleTyping = () => {
    if (!onTyping || disabled) return;

    const now = Date.now();
    // 마지막 타이핑 이벤트로부터 1초가 지났으면 전송
    if (now - lastTypingTimeRef.current >= 1000) {
      onTyping();
      lastTypingTimeRef.current = now;
    } else {
      // 아직 1초가 안 지났으면 타이머 설정
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        if (Date.now() - lastTypingTimeRef.current >= 1000) {
          onTyping();
          lastTypingTimeRef.current = Date.now();
        }
        typingTimeoutRef.current = null;
      }, 1000 - (now - lastTypingTimeRef.current));
    }
  };

  // 드래그 앤 드롭 핸들러
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    // dropZone 영역을 완전히 벗어났을 때만 isDragging을 false로 설정
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const file = files[0]; // 첫 번째 파일만 처리

    // 이미지 또는 영상 파일인지 확인
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      alert('이미지 또는 영상 파일만 업로드할 수 있습니다.');
      return;
    }

    // 파일 크기 확인 (이미지: 10MB, 영상: 50MB)
    const maxSize = isImage ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > maxSize) {
      const maxSizeMB = isImage ? '10MB' : '50MB';
      alert(`파일 크기가 너무 큽니다. ${isImage ? '이미지' : '영상'}는 최대 ${maxSizeMB}까지 업로드할 수 있습니다.`);
      return;
    }

    // 파일 전송
    try {
      await handleFileSelect(file);
    } catch (error) {
      console.error('드래그 앤 드롭 파일 전송 실패:', error);
    }
  };

  return (
    <>
      {/* 미리보기 (하단이 아닐 때 상대방 메시지) */}
      {previewMessage && !replyTo && (
        <div className="bg-gray-50 border-t border-gray-200 px-4 py-2">
          <button
            onClick={onPreviewClick}
            className="w-full text-left flex items-center gap-2 hover:bg-gray-100 rounded-lg p-2 transition-colors"
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-300 overflow-hidden">
              {previewMessage.sender?.profileImageUrl ? (
                <img
                  src={previewMessage.sender.profileImageUrl}
                  alt={previewMessage.sender.nickname || '상대방'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-gray-600">
                  {previewMessage.sender?.nickname?.[0] || '?'}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-gray-700 mb-0.5">
                {previewMessage.sender?.nickname || '상대방'}
              </div>
              <div className="text-sm text-gray-600 truncate">
                {previewMessage.type === 'image' ? '📷 사진' : 
                 previewMessage.type === 'file' ? '📎 파일' :
                 previewMessage.content || '메시지'}
              </div>
            </div>
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      )}
      
      {/* 답장 표시 */}
      {replyTo && (
        <div className="bg-gray-50/80 border-t border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-gray-900 mb-1 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                {typeof replyTo === 'object' && replyTo.sender
                  ? `${replyTo.sender?.nickname || '알 수 없음'}에게 답장`
                  : '답장'}
              </div>
              <div className="text-sm text-gray-700 bg-white/50 p-2 rounded">
                {typeof replyTo === 'object' 
                  ? (replyTo.isDeleted ? '삭제된 메시지입니다.' : (replyTo.content || ''))
                  : ''}
              </div>
            </div>
            <button
              onClick={onCancelReply}
              className="ml-2 p-1 rounded-full hover:bg-gray-200 transition-colors"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* 메시지 입력 영역 */}
      <div
        ref={dropZoneRef}
        className="bg-white border-t border-gray-200 p-4 relative"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* 드래그 오버레이 */}
        {isDragging && (
          <div className="absolute inset-0 bg-blue-500/10 border-2 border-dashed border-blue-500 rounded-lg flex items-center justify-center z-10 pointer-events-none">
            <div className="bg-white rounded-lg p-6 shadow-lg">
              <div className="flex flex-col items-center gap-2">
                <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm font-medium text-gray-900">이미지 또는 영상을 여기에 놓으세요</p>
                <p className="text-xs text-gray-500">이미지: 최대 10MB, 영상: 최대 50MB</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          {/* 이모티콘 버튼 */}
          <button
            type="button"
            onClick={() => {
              if (!disabled) {
                setShowEmoticonPicker(true);
              }
            }}
            disabled={disabled}
            className="flex-shrink-0 p-2 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="이모티콘"
            title={disabled ? '상대방이 나간 채팅방에서는 메시지를 보낼 수 없습니다' : '이모티콘'}
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {/* 이미지/영상 업로드 버튼 */}
          <button
            type="button"
            onClick={() => {
              if (!disabled) {
                setShowFileModal(true);
              }
            }}
            disabled={disabled}
            className="flex-shrink-0 p-2 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="이미지/영상 첨부"
            title={disabled ? '상대방이 나간 채팅방에서는 메시지를 보낼 수 없습니다' : '이미지/영상 첨부'}
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </button>

          {/* 텍스트 입력 */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                adjustTextareaHeight();
                handleTyping();
              }}
              onKeyPress={handleKeyPress}
              placeholder={disabled ? '상대방이 나간 채팅방입니다' : '메시지를 입력하세요...'}
              disabled={disabled}
              rows={1}
              className="w-full resize-none border border-gray-300 rounded-2xl px-4 py-2 pr-12 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed max-h-32 scrollbar-hide bg-white text-gray-900 placeholder-gray-500"
              style={{ minHeight: '40px', caretColor: '#111827' }}
            />
            
            {/* 전송 버튼 */}
            <button
              type="submit"
              disabled={!message.trim() || disabled}
              className="absolute right-2 bottom-2 p-2 rounded-full bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </form>
      </div>

      {/* 파일 업로드 모달 */}
      <FileUploadModal
        isOpen={showFileModal && !disabled}
        onClose={() => setShowFileModal(false)}
        onFileSelect={handleFileSelect}
      />

      {/* 이모티콘 선택 모달 */}
      <EmoticonPicker
        isOpen={showEmoticonPicker && !disabled}
        onClose={() => setShowEmoticonPicker(false)}
        onSelect={handleEmoticonSelect}
      />
    </>
  );
};

export default MessageInput;
