/**
 * ChatSettingsModal Component
 * 채팅방 설정 모달 컴포넌트
 */

import React, { useState } from 'react';
import { Modal } from '@/shared/components/Modal';

/**
 * @param {Object} props
 * @param {boolean} props.isOpen - 모달 열림 상태
 * @param {Function} props.onClose - 모달 닫기 핸들러
 * @param {Object} props.chatRoom - 채팅방 데이터
 * @param {Function} props.onUpdate - 채팅방 업데이트 핸들러
 */
const ChatSettingsModal = ({ isOpen, onClose, chatRoom, onUpdate }) => {
  const [settings, setSettings] = useState({
    name: chatRoom?.name || '',
    description: chatRoom?.description || '',
    isPublic: chatRoom?.isPublic || false
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdate?.(settings);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="채팅방 설정">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            채팅방 이름
          </label>
          <input
            type="text"
            name="name"
            value={settings.name}
            onChange={handleInputChange}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">
            설명
          </label>
          <textarea
            name="description"
            value={settings.description}
            onChange={handleInputChange}
            rows={3}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            name="isPublic"
            checked={settings.isPublic}
            onChange={handleInputChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label className="ml-2 block text-sm text-gray-900">
            공개 채팅방
          </label>
        </div>
        
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            취소
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            저장
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ChatSettingsModal;
