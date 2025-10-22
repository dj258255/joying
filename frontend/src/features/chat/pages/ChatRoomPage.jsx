/**
 * ChatRoomPage Component
 * 채팅방 페이지 컴포넌트
 */

import React, { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useChatContext } from '../contexts/ChatContext';
import { useMessages } from '../hooks/useMessages';
import MessageBubble from '../components/MessageBubble';
import MessageInput from '../components/MessageInput';

const ChatRoomPage = () => {
  const { chatRoomId } = useParams();
  const { currentChatRoom, messages, sendMessage, isConnected } = useChatContext();
  const { sendMessage: sendMessageApi, isSending } = useMessages(chatRoomId);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (content) => {
    try {
      if (isConnected) {
        sendMessage({ content });
      } else {
        await sendMessageApi({ content });
      }
    } catch (error) {
      console.error('메시지 전송 실패:', error);
    }
  };

  if (!currentChatRoom) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">채팅방을 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* 채팅방 헤더 */}
      <div className="bg-white border-b p-4">
        <h1 className="text-lg font-semibold text-gray-900">
          {currentChatRoom.name}
        </h1>
        <div className="text-sm text-gray-500">
          {isConnected ? '연결됨' : '연결 중...'}
        </div>
      </div>

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isOwn={message.sender?.id === 'current_user_id'} // TODO: 실제 사용자 ID로 교체
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 메시지 입력 */}
      <MessageInput
        onSendMessage={handleSendMessage}
        disabled={isSending || !isConnected}
      />
    </div>
  );
};

export default ChatRoomPage;
