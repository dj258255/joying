/**
 * MessageInput Component
 * 메시지 입력 컴포넌트 (카카오톡 스타일)
 */

import React, { useState, useRef } from 'react';
import FileUploadModal from './FileUploadModal';

/**
 * @param {Object} props
 * @param {Function} props.onSendMessage - 메시지 전송 핸들러
 * @param {Function} props.onSendFile - 파일 전송 핸들러
 * @param {Function} props.onTyping - 타이핑 이벤트 전송 핸들러
 * @param {boolean} props.disabled - 입력 비활성화 여부
 * @param {Object} props.replyTo - 답장할 메시지
 * @param {Function} props.onCancelReply - 답장 취소 핸들러
 */
const MessageInput = ({ 
  onSendMessage, 
  onSendFile,
  onTyping,
  disabled = false, 
  replyTo = null,
  onCancelReply 
}) => {
  const [message, setMessage] = useState('');
  const [showFileModal, setShowFileModal] = useState(false);
  const textareaRef = useRef(null);
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
    try {
      await onSendFile?.(file);
    } catch (error) {
      console.error('파일 전송 실패:', error);
      alert(error.message || '파일 전송에 실패했습니다.');
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

  return (
    <>
      {/* 답장 표시 */}
      {replyTo && (
        <div className="bg-blue-50/80 border-t border-blue-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-blue-600 mb-1 flex items-center gap-1">
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
      <div className="bg-white border-t border-gray-200 p-4">
        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          {/* 파일 업로드 버튼 */}
          <button
            type="button"
            onClick={() => setShowFileModal(true)}
            disabled={disabled}
            className="flex-shrink-0 p-2 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
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
              placeholder="메시지를 입력하세요..."
              disabled={disabled}
              rows={1}
              className="w-full resize-none border border-gray-300 rounded-2xl px-4 py-2 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 max-h-32 scrollbar-hide bg-white text-gray-900 placeholder-gray-500"
              style={{ minHeight: '40px', caretColor: '#111827' }}
            />
            
            {/* 전송 버튼 */}
            <button
              type="submit"
              disabled={!message.trim() || disabled}
              className="absolute right-2 bottom-2 p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
        isOpen={showFileModal}
        onClose={() => setShowFileModal(false)}
        onFileSelect={handleFileSelect}
      />
    </>
  );
};

export default MessageInput;
