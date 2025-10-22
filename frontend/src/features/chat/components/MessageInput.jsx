/**
 * MessageInput Component
 * 메시지 입력 컴포넌트
 */

import React, { useState } from 'react';

/**
 * @param {Object} props
 * @param {Function} props.onSendMessage - 메시지 전송 핸들러
 * @param {boolean} props.disabled - 입력 비활성화 여부
 */
const MessageInput = ({ onSendMessage, disabled = false }) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center space-x-2 p-4 border-t">
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="메시지를 입력하세요..."
        disabled={disabled}
        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={!message.trim() || disabled}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        전송
      </button>
    </form>
  );
};

export default MessageInput;
