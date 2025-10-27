/**
 * ChatListPage Component
 * 채팅방 목록 페이지 컴포넌트 (카카오톡 스타일)
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatRooms } from '../hooks/useChatRooms';
import { chatApi } from '../api/chatApi';
import ChatRoomListItem from '../components/ChatRoomListItem';
import SideNavbar from '../../../shared/components/Navbar/SideNavbar';

const ChatListPage = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const { chatRooms, isLoading, error, refetch } = useChatRooms({
    search: searchTerm
  });

  // 새로고침 기능
  useEffect(() => {
    const handleRefresh = () => {
      refetch();
    };

    // 주기적으로 채팅방 목록 새로고침 (30초마다)
    const interval = setInterval(handleRefresh, 30000);
    return () => clearInterval(interval);
  }, [refetch]);

  const handleChatRoomClick = (chatRoomId) => {
    navigate(`/chats/${chatRoomId}`);
  };


  const closeContextMenu = () => {
    setContextMenu(null);
  };

  const handleTogglePin = async (chatRoomId) => {
    try {
      await chatApi.togglePinChatRoom(chatRoomId);
      refetch();
      closeContextMenu();
    } catch (error) {
      console.error('고정 토글 실패:', error);
      alert('고정 상태 변경에 실패했습니다.');
    }
  };

  const handleToggleMute = async (chatRoomId) => {
    try {
      await chatApi.toggleMuteChatRoom(chatRoomId);
      refetch();
      closeContextMenu();
    } catch (error) {
      console.error('알림 토글 실패:', error);
      alert('알림 설정 변경에 실패했습니다.');
    }
  };

  const handleDeleteChat = async (chatRoomId) => {
    if (window.confirm('정말로 이 채팅방을 삭제하시겠습니까?')) {
      try {
        await chatApi.leaveChatRoom(chatRoomId);
        refetch();
        closeContextMenu();
      } catch (error) {
        console.error('채팅방 삭제 실패:', error);
        alert('채팅방 삭제에 실패했습니다.');
      }
    }
  };

  const handleSearchToggle = () => {
    setShowSearch(!showSearch);
    if (showSearch) {
      setSearchTerm('');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <div className="text-gray-500">채팅방 목록을 불러오는 중...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-red-500 mb-2">⚠️</div>
            <div className="text-red-500 mb-4">채팅방 목록을 불러올 수 없습니다.</div>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <SideNavbar />
      <div className="flex flex-col h-screen bg-gray-50">
        {/* 헤더 */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-lg font-semibold text-gray-900">채팅</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSearchToggle}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              <button
                onClick={() => refetch()}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          {/* 검색 바 */}
        {showSearch && (
          <div className="mt-3">
            <div className="relative">
              <input
                type="text"
                placeholder="채팅방 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
              <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        )}
        </div>

        {/* 채팅방 목록 */}
      <div className="flex-1 overflow-y-auto">
        {chatRooms.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {chatRooms.map((chatRoom) => (
              <ChatRoomListItem
                key={chatRoom.id}
                chatRoom={chatRoom}
                onClick={() => handleChatRoomClick(chatRoom.id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">채팅방이 없습니다</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm ? '검색 결과가 없습니다.' : '아직 대화한 채팅방이 없습니다.'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => navigate('/products')}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                상품 둘러보기
              </button>
            )}
          </div>
        )}
        </div>
      </div>

      {/* 컨텍스트 메뉴 */}
      {contextMenu && (
        <div className="fixed inset-0 z-50" onClick={closeContextMenu}>
          <div 
            className="absolute bg-white/90 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl p-2 animate-in zoom-in-95 duration-200"
            style={{
              left: Math.min(contextMenu.x, window.innerWidth - 200),
              top: Math.min(contextMenu.y, window.innerHeight - 200)
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1">
              <button
                onClick={() => handleTogglePin(contextMenu.chatRoom.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100/50 rounded-xl transition-all duration-200"
              >
                <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="font-medium">
                  {contextMenu.chatRoom.isPinned ? '고정 해제' : '고정하기'}
                </span>
              </button>
              
              <button
                onClick={() => handleToggleMute(contextMenu.chatRoom.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100/50 rounded-xl transition-all duration-200"
              >
                <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">
                  {contextMenu.chatRoom.isMuted ? '알림 켜기' : '알림 끄기'}
                </span>
              </button>
              
              <div className="border-t border-gray-200/50 my-1"></div>
              
              <button
                onClick={() => handleDeleteChat(contextMenu.chatRoom.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50/50 rounded-xl transition-all duration-200"
              >
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span className="font-medium">채팅방 나가기</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatListPage;
