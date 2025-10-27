/**
 * ChatRoomListItem Component
 * 채팅방 목록 아이템 컴포넌트 (카카오톡 스타일)
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileImage from '../../../shared/components/ProfileImage';
import { DUMMY_USERS } from '../../../shared/constants/dummyData';

/**
 * @param {Object} props
 * @param {Object} props.chatRoom - 채팅방 데이터
 * @param {Function} props.onClick - 클릭 핸들러
 * @param {boolean} props.isActive - 활성 상태
 */
const ChatRoomListItem = ({ chatRoom, onClick, isActive = false }) => {
  const navigate = useNavigate();
  const {
    id,
    name,
    lastMessage,
    unreadCount,
    participants,
    updatedAt,
    isPinned = false,
    isMuted = false
  } = chatRoom;

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return '방금 전';
    } else if (diffInHours < 24) {
      return date.toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffInHours < 48) {
      return '어제';
    } else {
      return date.toLocaleDateString('ko-KR', { 
        month: '2-digit', 
        day: '2-digit' 
      });
    }
  };

  const getLastMessageContent = () => {
    if (!lastMessage) return '메시지가 없습니다';
    
    if (lastMessage.type === 'image') {
      return '📷 사진';
    } else if (lastMessage.type === 'file') {
      return '📎 파일';
    } else if (lastMessage.type === 'rental_request') {
      return '🏠 대여 요청';
    } else {
      return lastMessage.content || '메시지가 없습니다';
    }
  };

  return (
    <div
      onClick={() => onClick(id)}
      className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
        isActive ? 'bg-blue-50' : ''
      }`}
    >
      <div className="flex items-center space-x-3">
        {/* 프로필 이미지 */}
        <div className="flex-shrink-0 relative">
          <ProfileImage 
            src={participants?.find(p => p.id !== DUMMY_USERS.currentUser.id)?.profileImage}
            alt={name}
            size={48}
            className="w-12 h-12 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              const opponent = participants?.find(p => p.id !== DUMMY_USERS.currentUser.id);
              if (opponent?.id) {
                navigate(`/members/${opponent.id}`);
              }
            }}
          />
          {/* 고정 표시 */}
          {isPinned && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
              <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
          )}
        </div>
        
        {/* 채팅방 정보 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-medium text-gray-900 truncate">
                {name}
              </h3>
              {/* 알림 꺼짐 표시 */}
              {isMuted && (
                <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {formatTime(updatedAt)}
              </span>
              {/* 읽지 않은 메시지 수 */}
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-2 rounded-full text-xs font-medium bg-red-500 text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
          </div>
          
          <p className="text-sm text-gray-600 truncate">
            {getLastMessageContent()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatRoomListItem;
