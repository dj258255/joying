/**
 * UserInfoEditor Component
 * 사용자 정보 수정 컴포넌트
 */

import React, { useState, useEffect } from 'react';
import { useUserProfile } from '../hooks/useUserProfile';

const UserInfoEditor = ({ userId, onSave }) => {
  const { user, updateUser, isLoading } = useUserProfile(userId);
  const [formData, setFormData] = useState({
    nickname: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        nickname: user.nickname || '',
        email: user.email || '',
        phone: user.phone || ''
      });
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // API 스펙에 맞춰 nickname만 전송
      await updateUser({ nickname: formData.nickname });
      onSave?.();
    } catch (error) {
      console.error('사용자 정보 수정 실패:', error);
    }
  };

  if (isLoading) {
    return <div>로딩 중...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          닉네임
        </label>
        <input
          type="text"
          name="nickname"
          value={formData.nickname}
          onChange={handleInputChange}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">
          이메일
        </label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">
          전화번호
        </label>
        <input
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleInputChange}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
        />
      </div>
      
      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50"
      >
        {isLoading ? '저장 중...' : '저장'}
      </button>
    </form>
  );
};

export default UserInfoEditor;
