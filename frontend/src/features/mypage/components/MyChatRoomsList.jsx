/**
 * MyChatRoomsList Component
 * 내 채팅방 목록 컴포넌트
 */

import React, { useState } from 'react';

const MyChatRoomsList = () => {
  const [filter, setFilter] = useState('all');

  // 더미 데이터
  const chatRooms = [
    {
      id: 'chat1',
      type: 'direct',
      participants: [
        { id: 'user123', nickname: '나' },
        { id: 'user456', nickname: '김대여' }
      ],
      lastMessage: {
        content: '카메라 대여 가능한가요?',
        senderName: '김대여',
        createdAt: '2024-01-15T12:00:00Z',
        type: 'text'
      },
      unreadCount: 2,
      isPinned: true,
      isMuted: false,
      productName: '캐논 EOS R5',
      productImage: 'https://via.placeholder.com/50x50/7C3AED/FFFFFF?text=캐논'
    },
    {
      id: 'chat2',
      type: 'direct',
      participants: [
        { id: 'user123', nickname: '나' },
        { id: 'user789', nickname: '박대여' }
      ],
      lastMessage: {
        content: '네, 가능합니다! 언제 필요하신가요?',
        senderName: '박대여',
        createdAt: '2024-01-15T11:30:00Z',
        type: 'text'
      },
      unreadCount: 0,
      isPinned: false,
      isMuted: false,
      productName: '닌텐도 스위치',
      productImage: 'https://via.placeholder.com/50x50/EF4444/FFFFFF?text=닌텐도'
    },
    {
      id: 'chat3',
      type: 'direct',
      participants: [
        { id: 'user123', nickname: '나' },
        { id: 'user101', nickname: '이빌림' }
      ],
      lastMessage: {
        content: '이미지 파일을 전송했습니다',
        senderName: '이빌림',
        createdAt: '2024-01-14T16:45:00Z',
        type: 'image'
      },
      unreadCount: 1,
      isPinned: false,
      isMuted: true,
      productName: '아이폰 15 Pro',
      productImage: 'https://via.placeholder.com/50x50/3B82F6/FFFFFF?text=아이폰'
    },
    {
      id: 'chat4',
      type: 'direct',
      participants: [
        { id: 'user123', nickname: '나' },
        { id: 'user202', nickname: '최빌림' }
      ],
      lastMessage: {
        content: '감사합니다! 잘 사용하겠습니다',
        senderName: '최빌림',
        createdAt: '2024-01-13T09:20:00Z',
        type: 'text'
      },
      unreadCount: 0,
      isPinned: false,
      isMuted: false,
      productName: '맥북 에어 M2',
      productImage: 'https://via.placeholder.com/50x50/059669/FFFFFF?text=맥북'
    }
  ];

  const filteredChatRooms = chatRooms.filter(chatRoom => {
    if (filter === 'all') return true;
    if (filter === 'unread') return chatRoom.unreadCount > 0;
    if (filter === 'pinned') return chatRoom.isPinned;
    return true;
  });

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    } else if (diffInHours < 168) { // 7일
      return date.toLocaleDateString('ko-KR', { 
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } else {
      return date.toLocaleDateString('ko-KR', { 
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const getMessageIcon = (type) => {
    switch (type) {
      case 'image':
        return (
          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
          </svg>
        );
      case 'file':
        return (
          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-4 lg:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h2 className="text-xl lg:text-2xl font-bold text-gray-900">채팅방</h2>
            <p className="text-gray-600 mt-1 text-sm lg:text-base">나의 채팅방 목록을 확인하세요</p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">전체</option>
              <option value="unread">읽지 않음</option>
              <option value="pinned">고정됨</option>
            </select>
          </div>
        </div>
      </div>

      {filteredChatRooms.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-gray-500 text-lg">아직 채팅방이 없습니다</p>
          <button className="mt-4 bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors">
            상품 둘러보기
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredChatRooms.map((chatRoom) => (
            <div 
              key={chatRoom.id} 
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-center space-x-4">
                {/* 상품 이미지 */}
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  <img 
                    src={chatRoom.productImage} 
                    alt={chatRoom.productName}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* 채팅방 정보 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {chatRoom.participants.find(p => p.id !== 'user123')?.nickname || '상대방'}
                    </h3>
                    {chatRoom.isPinned && (
                      <svg className="w-4 h-4 text-yellow-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    )}
                    {chatRoom.isMuted && (
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.814L5.617 14H3a1 1 0 01-1-1V7a1 1 0 011-1h2.617l2.766-2.814a1 1 0 011.617.814zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm text-gray-600">상품:</span>
                    <span className="text-sm font-medium text-gray-900">{chatRoom.productName}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {getMessageIcon(chatRoom.lastMessage.type)}
                    <p className="text-sm text-gray-600 truncate">
                      {chatRoom.lastMessage.senderName}: {chatRoom.lastMessage.content}
                    </p>
                  </div>
                </div>

                {/* 시간 및 읽지 않은 메시지 */}
                <div className="text-right flex-shrink-0">
                  <div className="text-xs text-gray-500 mb-1">
                    {formatTime(chatRoom.lastMessage.createdAt)}
                  </div>
                  {chatRoom.unreadCount > 0 && (
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full">
                      {chatRoom.unreadCount > 99 ? '99+' : chatRoom.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyChatRoomsList;
