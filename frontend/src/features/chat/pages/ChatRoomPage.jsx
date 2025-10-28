/**
 * ChatRoomPage Component
 * 채팅방 페이지 컴포넌트 (카카오톡 스타일)
 */

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useChatContext } from '../contexts/ChatContext';
import { useMessages } from '../hooks/useMessages';
import MessageBubble from '../components/MessageBubble';
import ProfileImage from '../../../shared/components/ProfileImage';
import MessageInput from '../components/MessageInput';
import ChatSettingsModal from '../components/ChatSettingsModal';
import RentalRequestCard from '../components/RentalRequestCard';
import { DUMMY_USERS } from '../../../shared/constants/dummyData';
import SideNavbar from '../../../shared/components/Navbar/SideNavbar';

const ChatRoomPage = () => {
  const { chatRoomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentChatRoom, messages, sendMessage, isConnected, setCurrentChatRoom, isLoading, error } = useChatContext();
  const messagesEndRef = useRef(null);
  
  // 상태 관리
  const [rentalInfo, setRentalInfo] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    // 채팅방 로드
    if (chatRoomId) {
      try {
        setCurrentChatRoom(chatRoomId);
      } catch (error) {
        console.error('채팅방 로드 실패:', error);
      }
    }

    // 라우터 state에서 대여 정보 가져오기
    if (location.state?.rentalInfo) {
      setRentalInfo(location.state.rentalInfo);
    }
  }, [chatRoomId, location.state]); // setCurrentChatRoom을 의존성에서 제거

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (messageData) => {
    try {
      await sendMessage(messageData);
    } catch (error) {
      console.error('메시지 전송 실패:', error);
      alert('메시지 전송에 실패했습니다.');
    }
  };

  const handleSendFile = async (file) => {
    try {
      // 파일을 Base64로 변환
      const reader = new FileReader();
      reader.onload = (e) => {
        const messageData = {
          content: e.target.result,
          type: 'image'
        };
        sendMessage(messageData);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('파일 전송 실패:', error);
    }
  };

  const handleReply = (message) => {
    setReplyTo(message);
  };

  const handleCancelReply = () => {
    setReplyTo(null);
  };

  const handleUpdateSettings = async (settings) => {
    try {
      // 채팅방 설정 업데이트 API 호출
      console.log('설정 업데이트:', settings);
    } catch (error) {
      console.error('설정 업데이트 실패:', error);
    }
  };

  const handleRentalAccept = async (rentalInfo) => {
    try {
      // 대여 요청 승인 API 호출
      console.log('대여 요청 승인:', rentalInfo);
      alert('대여 요청을 승인했습니다.');
    } catch (error) {
      console.error('대여 승인 실패:', error);
    }
  };

  const handleRentalReject = async (rentalInfo) => {
    try {
      // 대여 요청 거절 API 호출
      console.log('대여 요청 거절:', rentalInfo);
      alert('대여 요청을 거절했습니다.');
    } catch (error) {
      console.error('대여 거절 실패:', error);
    }
  };

  if (isLoading) {
    return (
      <>
        <SideNavbar />
        <div className="flex flex-col h-screen bg-gray-50">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <div className="text-gray-500">채팅방을 불러오는 중...</div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error || !currentChatRoom) {
    return (
      <>
        <SideNavbar />
        <div className="flex flex-col h-screen bg-gray-50">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-red-500 mb-2">⚠️</div>
              <div className="text-red-500 mb-4">채팅방을 불러올 수 없습니다.</div>
              <button
                onClick={() => navigate('/chats')}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                채팅 목록으로 돌아가기
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SideNavbar />
      <div className="flex flex-col h-screen bg-gray-50">
      {/* 채팅방 헤더 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 relative">
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
            <div className="flex items-center gap-3">
              <ProfileImage 
                src={currentChatRoom.participants?.find(p => p.id !== 101)?.profileImage}
                alt={currentChatRoom.name}
                size={40}
                className="w-10 h-10 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => {
                  const opponent = currentChatRoom.participants?.find(p => p.id !== 101);
                  console.log('ChatRoomPage - participants:', currentChatRoom.participants);
                  console.log('ChatRoomPage - opponent:', opponent);
                  if (opponent?.id) {
                    console.log('ChatRoomPage - navigating to:', `/members/${opponent.id}`);
                    navigate(`/members/${opponent.id}`);
                  } else {
                    console.log('ChatRoomPage - opponent not found');
                  }
                }}
              />
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {currentChatRoom.name}
                </h1>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  <span className="text-sm text-gray-500">
                    {isConnected ? '온라인' : '연결 중...'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          {/* 설정 버튼을 navbar 영역 밖으로 이동 */}
          <div className="relative z-20">
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors bg-white shadow-sm border border-gray-200"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 대여 요청 카드 */}
      {rentalInfo && (
        <div className="p-4">
          <RentalRequestCard
            rentalInfo={rentalInfo}
            onAccept={() => handleRentalAccept(rentalInfo)}
            onReject={() => handleRentalReject(rentalInfo)}
          />
        </div>
      )}

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-hide">
        {messages.length > 0 ? (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.sender?.id === 101}
              onReply={handleReply}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">메시지가 없습니다</h3>
            <p className="text-gray-500">첫 번째 메시지를 보내보세요!</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 메시지 입력 */}
      <MessageInput
        onSendMessage={handleSendMessage}
        onSendFile={handleSendFile}
        disabled={false}
        replyTo={replyTo}
        onCancelReply={handleCancelReply}
      />

      {/* 채팅방 설정 모달 */}
      <ChatSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        chatRoom={currentChatRoom}
        onUpdateSettings={handleUpdateSettings}
      />
    </div>
    </>
  );
};

export default ChatRoomPage;
