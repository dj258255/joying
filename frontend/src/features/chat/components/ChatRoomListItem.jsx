/**
 * ChatRoomListItem Component
 * 채팅방 목록 아이템 컴포넌트 (카카오톡 스타일)
 */

import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileImage from '../../../shared/components/ProfileImage';

/**
 * @param {Object} props
 * @param {Object} props.chatRoom - 채팅방 데이터
 * @param {Function} props.onClick - 클릭 핸들러
 * @param {Function} [props.onContextMenuOpen] - 컨텍스트 메뉴 열기 핸들러(더블클릭/롱프레스)
 * @param {boolean} props.isActive - 활성 상태
 */
const ChatRoomListItem = ({ chatRoom, onClick, onContextMenuOpen, isActive = false }) => {
  const navigate = useNavigate();
  const pressTimerRef = useRef(null);
  const lastTouchPosRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const rootRef = useRef(null);
  
  // 백엔드 API 응답 형식에 맞게 데이터 추출
  const {
    id,
    chatRoomId, // 백엔드 응답 형식
    name,
    productTitle, // 백엔드 응답: 상품 제목
    productImageUrl, // 백엔드 응답: 상품 이미지
    otherMemberId, // 백엔드 응답: 상대방 ID
    otherMemberNickname, // 백엔드 응답: 상대방 닉네임
    otherMemberProfileUrl, // 백엔드 응답: 상대방 프로필 이미지
    lastMessage, // 백엔드 응답: 마지막 메시지 내용
    lastMessageAt, // 백엔드 응답: 마지막 메시지 시간
    unreadCount,
    participants, // 로컬 스토리지 형식 (호환성 유지)
    updatedAt,
    isPinned = false,
    isMuted = false,
    member // 백엔드 응답: 참여자 정보 (온라인 상태 포함)
  } = chatRoom;
  
  // 채팅방 ID (백엔드 형식 우선)
  const roomId = chatRoomId || id;
  
  // 채팅방 이름 (상품 제목 또는 기존 name)
  const roomName = productTitle || name || otherMemberNickname || '채팅방';
  
  // 모바일에서 상품명 길이 제한 (10글자)
  const truncateProductTitle = (title, maxLength = 10) => {
    if (!title) return '';
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength) + '...';
  };
  
  // 상품명이 있는 경우 모바일에서만 자르기
  const displayRoomName = productTitle 
    ? (
        <>
          <span className="sm:hidden">{truncateProductTitle(roomName, 10)}</span>
          <span className="hidden sm:inline">{roomName}</span>
        </>
      )
    : roomName;
  
  // 프로필 이미지 (상대방 프로필 또는 상품 이미지)
  const profileImage = otherMemberProfileUrl || productImageUrl || participants?.find(p => p.id !== 101)?.profileImage;

  // 디버깅: 프로필 이미지 URL 확인
  if (!profileImage || profileImage === '/images/default_profile_image.png') {
    console.log('[ChatRoomListItem] 프로필 이미지 디버깅:', {
      chatRoomId: roomId,
      otherMemberProfileUrl,
      productImageUrl,
      finalProfileImage: profileImage
    });
  }
  
  // 마지막 메시지 시간 (백엔드 형식 우선)
  const lastMessageTime = lastMessageAt || updatedAt;
  
  // 읽지 않은 메시지 수 (숫자로 변환하여 안전하게 처리)
  const unreadCountNum = Number(unreadCount) || 0;

  const formatTime = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now - date;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    // 1분 미만: "방금 전" (1분 전부터 시작하므로 0분은 방금 전)
    if (diffInMinutes < 1) {
      return '방금 전';
    }
    // 1분 ~ 59분: "N분 전"
    else if (diffInMinutes < 60) {
      return `${diffInMinutes}분 전`;
    }
    // 1시간 이상 ~ 23시간: "N시간 전"
    else if (diffInHours < 24) {
      return `${diffInHours}시간 전`;
    }
    // 하루 이상: 날짜로 표시 (MM/DD 형식)
    else {
      return date.toLocaleDateString('ko-KR', { 
        month: '2-digit', 
        day: '2-digit' 
      });
    }
  };

  const getLastMessageContent = () => {
    // 백엔드 응답: lastMessage는 문자열일 수 있음
    if (!lastMessage) return '메시지가 없습니다';
    
    // 문자열인 경우 JSON 형식인지 확인
    if (typeof lastMessage === 'string') {
      // MESSAGE_TYPE: 으로 시작하는 텍스트 제거
      let contentStr = lastMessage.trim();
      
      // MESSAGE_TYPE: 으로 시작하는 줄과 그 이후의 모든 내용 제거
      const messageTypeIndex = contentStr.indexOf('MESSAGE_TYPE:');
      if (messageTypeIndex !== -1) {
        // MESSAGE_TYPE: 이전의 내용만 가져오기
        contentStr = contentStr.substring(0, messageTypeIndex).trim();
      }
      
      // JSON 형식인 경우 "대여 요청"으로 변환
      try {
        const jsonStartIndex = contentStr.indexOf('{');
        const jsonEndIndex = contentStr.lastIndexOf('}');
        
        if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
          const jsonStr = contentStr.substring(jsonStartIndex, jsonEndIndex + 1);
          const parsed = JSON.parse(jsonStr);
          
          // RENTAL_REQUEST 타입이면 "대여 요청"으로 표시
          if (parsed && parsed.type === 'RENTAL_REQUEST') {
            return '대여 요청';
          }
        } else if (contentStr.startsWith('{') && contentStr.endsWith('}')) {
          // 전체가 JSON 문자열인 경우
          const parsed = JSON.parse(contentStr);
          if (parsed && parsed.type === 'RENTAL_REQUEST') {
            return '대여 요청';
          }
        }
      } catch (e) {
        // JSON 파싱 실패 시 원본 반환
      }
      
      return contentStr || '메시지가 없습니다';
    }
    
    // 객체인 경우 (로컬 스토리지 형식 호환)
    if (typeof lastMessage === 'object') {
      let content = lastMessage.content || '';
      
      // content가 문자열인 경우 MESSAGE_TYPE: 제거
      if (typeof content === 'string') {
        const messageTypeIndex = content.indexOf('MESSAGE_TYPE:');
        if (messageTypeIndex !== -1) {
          content = content.substring(0, messageTypeIndex).trim();
        }
      }
      
      if (lastMessage.type === 'image') {
        return '📷 사진';
      } else if (lastMessage.type === 'file') {
        return '📎 파일';
      } else if (lastMessage.type === 'rental_request') {
        return '대여 요청';
      } else {
        return content || '메시지가 없습니다';
      }
    }
    
    return '메시지가 없습니다';
  };

  // 롱프레스 시작/취소
  const startPressTimer = (x, y) => {
    if (!onContextMenuOpen) return;
    clearTimeout(pressTimerRef.current);
    pressTimerRef.current = setTimeout(() => {
      onContextMenuOpen(roomId, x ?? lastTouchPosRef.current.x, y ?? lastTouchPosRef.current.y);
    }, 400);
  };
  const cancelPressTimer = () => {
    clearTimeout(pressTimerRef.current);
    pressTimerRef.current = null;
  };

  useEffect(() => () => cancelPressTimer(), []);

  return (
    <div
      ref={rootRef}
      onClick={() => onClick(roomId)}
      onContextMenu={(e) => {
        if (!onContextMenuOpen) return;
        e.preventDefault();
        e.stopPropagation();
        onContextMenuOpen(roomId, e.clientX, e.clientY);
      }}
      onTouchStart={(e) => {
        const t = e.touches?.[0];
        if (t) {
          lastTouchPosRef.current = { x: t.clientX, y: t.clientY };
          startPressTimer(t.clientX, t.clientY);
        } else {
          startPressTimer();
        }
      }}
      onTouchEnd={cancelPressTimer}
      onTouchMove={cancelPressTimer}
      onMouseDown={(e) => {
        // 터치 디바이스가 아닌 경우에만 롱프레스 감지
        if ('ontouchstart' in window) return;
        if (e.button === 0) startPressTimer();
      }}
      onMouseUp={cancelPressTimer}
      onMouseLeave={cancelPressTimer}
      className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
        isActive ? 'bg-blue-50' : ''
      }`}
    >
      <div className="flex items-center space-x-3">
        {/* 프로필 이미지 영역 */}
        <div className="flex-shrink-0 flex items-center gap-2">
          {/* 유저 프로필 이미지 */}
          <div className="relative">
            <ProfileImage
              src={otherMemberProfileUrl || participants?.find(p => p.id !== 101)?.profileImage}
              alt={otherMemberNickname || '사용자'}
              size={48}
              className="w-12 h-12 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                const opponentId = otherMemberId || participants?.find(p => p.id !== 101)?.id;
                if (opponentId) {
                  navigate(`/members/${opponentId}`);
                }
              }}
            />
            {/* 온라인 상태 표시 */}
            {member && (
              <div
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                  member.isOnline ? 'bg-green-500' : 'bg-gray-400'
                }`}
                title={member.isOnline ? '온라인' : '오프라인'}
              />
            )}
          </div>

          {/* 상품 이미지 */}
          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
            {productImageUrl ? (
              <img
                src={productImageUrl}
                alt={productTitle || '상품'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"%3E%3Crect fill="%23E5E7EB" width="48" height="48"/%3E%3Cg fill="%239CA3AF"%3E%3Cpath d="M19 19h10v10H19z" opacity="0.3"/%3E%3Ccircle cx="21.5" cy="21.5" r="1.5"/%3E%3Cpath d="M19 29l2.5-3.5 2 2.5 3-4.5 2.5 5.5H19z"/%3E%3C/g%3E%3Ctext x="24" y="38" text-anchor="middle" fill="%239CA3AF" font-family="Arial" font-size="6"%3E이미지 없음%3C/text%3E%3C/svg%3E';
                }}
              />
            ) : (
              // 상품이 삭제된 경우 플레이스홀더
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                <svg className="w-6 h-6 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="text-[8px] leading-none">삭제됨</span>
              </div>
            )}
            {/* 고정 표시 */}
            {isPinned && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center shadow-sm z-10">
                <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
            )}
          </div>
        </div>
        
        {/* 채팅방 정보 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <h3 className="text-base font-medium text-gray-900 truncate">
                {displayRoomName}
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
                {lastMessageTime ? formatTime(lastMessageTime) : ''}
              </span>
              {/* 읽지 않은 메시지 수 - unreadCount가 있을 때만 표시 */}
              {unreadCountNum > 0 && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-2 rounded-full text-xs font-medium bg-red-500 text-white">
                  {unreadCountNum > 99 ? '99+' : unreadCountNum}
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
