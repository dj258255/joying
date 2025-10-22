/**
 * ChatListPage Component
 * 채팅방 목록 페이지 컴포넌트
 */

import React, { useState } from 'react';
import { useChatRooms } from '../hooks/useChatRooms';
import ChatRoomListItem from '../components/ChatRoomListItem';

const ChatListPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { chatRooms, isLoading, error } = useChatRooms({
    search: searchTerm
  });

  const handleChatRoomClick = (chatRoomId) => {
    // TODO: 채팅방 페이지로 이동
    console.log('채팅방 선택:', chatRoomId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">채팅방 목록을 불러올 수 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow rounded-lg">
        <div className="p-4 border-b">
          <h1 className="text-xl font-semibold text-gray-900">채팅방</h1>
          <input
            type="text"
            placeholder="채팅방 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="divide-y divide-gray-200">
          {chatRooms.length > 0 ? (
            chatRooms.map((chatRoom) => (
              <ChatRoomListItem
                key={chatRoom.id}
                chatRoom={chatRoom}
                onClick={handleChatRoomClick}
              />
            ))
          ) : (
            <div className="p-8 text-center text-gray-500">
              채팅방이 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatListPage;
