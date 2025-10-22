/**
 * ChatRoomListItem Component
 * 채팅방 목록 아이템 컴포넌트
 */

import React from 'react';

/**
 * @param {Object} props
 * @param {Object} props.chatRoom - 채팅방 데이터
 * @param {Function} props.onClick - 클릭 핸들러
 * @param {boolean} props.isActive - 활성 상태
 */
const ChatRoomListItem = ({ chatRoom, onClick, isActive = false }) => {
  const {
    id,
    name,
    lastMessage,
    unreadCount,
    participants,
    updatedAt
  } = chatRoom;

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else {
      return date.toLocaleDateString('ko-KR');
    }
  };

  return (
    <div
      onClick={() => onClick(id)}
      className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
        isActive ? 'bg-blue-50 border-blue-200' : ''
      }`}
    >
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
            <span className="text-gray-600 font-medium">
              {name?.charAt(0) || '?'}
            </span>
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900 truncate">
              {name}
            </h3>
            <span className="text-xs text-gray-500">
              {formatTime(updatedAt)}
            </span>
          </div>
          
          <div className="flex items-center justify-between mt-1">
            <p className="text-sm text-gray-600 truncate">
              {lastMessage?.content || '메시지가 없습니다'}
            </p>
            {unreadCount > 0 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                {unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatRoomListItem;
