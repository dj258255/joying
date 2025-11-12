/**
 * ChatSettingsModal Component
 * 채팅방 설정 모달 컴포넌트 (카카오톡 스타일)
 */

import React, { useEffect, useState } from 'react';
import { chatApi } from '../api/chatApi';
import { useNavigate } from 'react-router-dom';
import { useChatRooms } from '../hooks/useChatRooms';

const ChatSettingsModal = ({ isOpen, onClose, chatRoom, onUpdateSettings }) => {
  const navigate = useNavigate();
  const { leaveChatRoom, isLeaving } = useChatRooms();
  const [settings, setSettings] = useState({
    isPinned: chatRoom?.isPinned || false,
    isMuted: chatRoom?.isMuted || false
  });

  useEffect(() => {
    setSettings({
      isPinned: chatRoom?.isPinned || false,
      isMuted: chatRoom?.isMuted || false
    });
  }, [chatRoom?.isPinned, chatRoom?.isMuted, isOpen]);

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    const roomId = chatRoom?.chatRoomId || chatRoom?.id;
    if (!roomId) {
      alert('채팅방 정보를 확인할 수 없습니다.');
      return;
    }

    const payload = {};
    if (settings.isPinned !== chatRoom?.isPinned) {
      payload.isPinned = settings.isPinned;
    }
    if (settings.isMuted !== chatRoom?.isMuted) {
      payload.isMuted = settings.isMuted;
    }

    try {
      let updatedSettings = {};
      if (Object.keys(payload).length > 0) {
        updatedSettings = await chatApi.updateChatRoomSettings(roomId, payload);
      }

      onUpdateSettings({
        isPinned: updatedSettings?.isPinned ?? settings.isPinned,
        isMuted: updatedSettings?.isMuted ?? settings.isMuted
      });
      onClose();
    } catch (error) {
      console.error('설정 저장 실패:', error);
      alert(error.message || '설정 저장에 실패했습니다.');
    }
  };

  const handleLeaveChat = async () => {
    if (window.confirm('정말로 채팅방을 나가시겠습니까?')) {
      try {
        const roomId = chatRoom?.chatRoomId || chatRoom?.id;
        if (!roomId) {
          alert('채팅방 정보를 확인할 수 없습니다.');
          return;
        }
        // useChatRooms의 leaveChatRoom mutation 사용 (낙관적 업데이트 포함)
        await leaveChatRoom(roomId);
        navigate('/chats');
        onClose();
      } catch (error) {
        console.error('채팅방 나가기 실패:', error);
        alert(error.message || '채팅방 나가기에 실패했습니다.');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 배경 오버레이 */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* 모달 컨텐츠 */}
      <div className="relative w-full max-w-md bg-white/90 backdrop-blur-lg border border-white/20 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200/50">
          <h2 className="text-xl font-semibold text-gray-900">채팅방 설정</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-gray-100/50 hover:bg-gray-100/70 transition-all duration-200 hover:scale-105"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 설정 옵션 */}
        <div className="p-6 space-y-6">
          {/* 채팅방 고정 */}
          <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">채팅방 고정</h3>
                <p className="text-sm text-gray-600">목록 상단에 고정</p>
              </div>
            </div>
            <button
              onClick={() => handleSettingChange('isPinned', !settings.isPinned)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-200 ${
                settings.isPinned ? 'bg-blue-500 shadow-lg' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                  settings.isPinned ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* 알림 설정 */}
          <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.5 19.5a2.5 2.5 0 01-2.5-2.5V7a2.5 2.5 0 012.5-2.5h5a2.5 2.5 0 012.5 2.5v10a2.5 2.5 0 01-2.5 2.5h-5z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">알림 끄기</h3>
                <p className="text-sm text-gray-600">새 메시지 알림 비활성화</p>
              </div>
            </div>
            <button
              onClick={() => handleSettingChange('isMuted', !settings.isMuted)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-200 ${
                settings.isMuted ? 'bg-blue-500 shadow-lg' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                  settings.isMuted ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="p-6 border-t border-gray-200/50 space-y-3">
          <button
            onClick={handleSave}
            className="w-full py-4 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-2xl font-semibold hover:from-gray-700 hover:to-gray-800 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-[1.02]"
          >
            설정 저장
          </button>
          <button
            onClick={handleLeaveChat}
            disabled={isLeaving}
            className="w-full py-4 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-2xl font-semibold hover:from-gray-600 hover:to-gray-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isLeaving ? '나가는 중...' : '채팅방 나가기'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatSettingsModal;