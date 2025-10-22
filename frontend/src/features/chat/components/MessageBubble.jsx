/**
 * MessageBubble Component
 * 메시지 버블 컴포넌트
 */

import React from 'react';

/**
 * @param {Object} props
 * @param {Object} props.message - 메시지 데이터
 * @param {boolean} props.isOwn - 자신의 메시지 여부
 */
const MessageBubble = ({ message, isOwn = false }) => {
  const { content, sender, timestamp, type } = message;

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (type === 'system') {
    return (
      <div className="flex justify-center my-2">
        <span className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
          {content}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
        isOwn 
          ? 'bg-blue-500 text-white' 
          : 'bg-gray-200 text-gray-900'
      }`}>
        {!isOwn && (
          <div className="text-xs font-medium text-gray-600 mb-1">
            {sender?.nickname || '알 수 없음'}
          </div>
        )}
        <div className="text-sm">{content}</div>
        <div className={`text-xs mt-1 ${
          isOwn ? 'text-blue-100' : 'text-gray-500'
        }`}>
          {formatTime(timestamp)}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
