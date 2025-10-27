/**
 * MessageBubble Component
 * 메시지 버블 컴포넌트 (카카오톡 스타일)
 */

import React, { useState, useRef } from 'react';

/**
 * @param {Object} props
 * @param {Object} props.message - 메시지 데이터
 * @param {boolean} props.isOwn - 자신의 메시지 여부
 * @param {Function} props.onReply - 답장 핸들러
 */
const MessageBubble = ({ message, isOwn = false, onReply }) => {
  const { content, sender, timestamp, type, replyTo, isRead } = message;
  const [showActions, setShowActions] = useState(false);
  const longPressTimer = useRef(null);
  const isLongPress = useRef(false);

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDoubleClick = () => {
    setShowActions(true);
  };

  const handleReply = () => {
    onReply?.(message);
    setShowActions(false);
  };

  // 롱프레스 시작
  const handleTouchStart = (e) => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      setShowActions(true);
      // 햅틱 피드백 (지원하는 디바이스에서)
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 400); // 400ms 후 롱프레스로 인식
  };

  // 롱프레스 종료
  const handleTouchEnd = (e) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // 터치 이동 시 롱프레스 취소
  const handleTouchMove = (e) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // 클릭 이벤트 (롱프레스가 아닌 경우에만)
  const handleClick = (e) => {
    if (!isLongPress.current) {
      // 일반 클릭 처리 (필요시)
    }
    isLongPress.current = false;
  };

  // 시스템 메시지
  if (type === 'system') {
    return (
      <div className="flex justify-center my-3">
        <span className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
          {content}
        </span>
      </div>
    );
  }

  // 대여 요청 메시지
  if (type === 'rental_request') {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}>
        <div className="max-w-sm">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-2xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-900">대여 요청</span>
            </div>
            <p className="text-sm text-gray-700">{content}</p>
          </div>
          <div className={`text-xs mt-1 ${isOwn ? 'text-right' : 'text-left'} text-gray-500`}>
            {formatTime(timestamp)}
          </div>
        </div>
      </div>
    );
  }

  // 이미지 메시지
  if (type === 'image') {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}>
        <div className="max-w-xs">
          <div 
            className="relative group"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchMove}
            onClick={(e) => {
              if (!isLongPress.current) {
                window.open(content, '_blank');
              }
              handleClick(e);
            }}
          >
            <img 
              src={content} 
              alt="전송된 이미지"
              className="rounded-2xl max-w-full h-auto cursor-pointer"
            />
            {/* 이미지 확대 아이콘 */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-black/50 rounded-full p-1">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
              </div>
            </div>
          </div>
          <div className={`text-xs mt-1 ${isOwn ? 'text-right' : 'text-left'} text-gray-500`}>
            {formatTime(timestamp)}
            {isOwn && isRead && (
              <span className="ml-1 text-blue-500">✓✓</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 일반 텍스트 메시지
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className="max-w-xs lg:max-w-md">
        {/* 답장 표시 */}
        {replyTo && (
          <div className="mb-2">
            <div className="bg-blue-50/80 border-l-4 border-blue-400 p-3 rounded-r-lg">
              <div className="text-xs font-semibold text-blue-600 mb-1 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                {replyTo.sender?.nickname || '알 수 없음'}에게 답장
              </div>
              <div className="text-sm text-gray-700 bg-white/50 p-2 rounded">
                {replyTo.content}
              </div>
            </div>
          </div>
        )}
        
        {/* 메시지 버블 */}
        <div 
          className={`relative px-4 py-2 rounded-2xl ${
            isOwn 
              ? 'bg-blue-500 text-white rounded-br-md' 
              : 'bg-gray-200 text-gray-900 rounded-bl-md'
          }`}
          onDoubleClick={handleDoubleClick}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
          onClick={handleClick}
        >
          {!isOwn && (
            <div className="text-xs font-medium text-gray-600 mb-1">
              {sender?.nickname || '알 수 없음'}
            </div>
          )}
          <div className="text-sm whitespace-pre-wrap">{content}</div>
        </div>
        
        {/* 시간 및 읽음 표시 */}
        <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
          <span className="text-xs text-gray-500">
            {formatTime(timestamp)}
          </span>
          {isOwn && (
            <div className="flex items-center">
              {isRead ? (
                <span className="text-blue-500 text-xs">✓✓</span>
              ) : (
                <span className="text-gray-400 text-xs">✓</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 액션 메뉴 */}
      {showActions && (
        <div className="fixed inset-0 z-40" onClick={() => setShowActions(false)}>
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl p-2 flex gap-2 animate-in zoom-in-95 duration-200">
            <button
              onClick={handleReply}
              className="px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl text-sm font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              답장
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(content);
                setShowActions(false);
              }}
              className="px-4 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl text-sm font-medium hover:from-gray-600 hover:to-gray-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              복사
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageBubble;
