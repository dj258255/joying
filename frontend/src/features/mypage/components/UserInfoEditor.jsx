/**
 * UserInfoEditor Component
 * 회원 정보 수정 컴포넌트
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useUserProfile } from '@/features/user/hooks/useUserProfile';

const UserInfoEditor = ({ onSave }) => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const memberId = currentUser?.memberId || currentUser?.id;
  const { user, updateUser, isLoading, isUpdating } = useUserProfile(memberId);
  
  const [formData, setFormData] = useState({
    nickname: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        nickname: user.nickname || ''
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
    if (!memberId) {
      alert('로그인이 필요합니다.');
      return;
    }
    
    try {
      // API 스펙에 맞춰 nickname만 전송
      await updateUser({ nickname: formData.nickname });
      alert('회원 정보가 수정되었습니다.');
      onSave?.();
    } catch (error) {
      
      alert('회원 정보 수정에 실패했습니다.');
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">회원 정보 수정</h2>
        <p className="text-gray-600 mt-2 text-sm">나의 회원 정보를 수정하세요</p>
      </div>

      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">로딩 중...</p>
            </div>
          ) : (
            <div>
              {/* 닉네임 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  닉네임 *
                </label>
                <input
                  type="text"
                  name="nickname"
                  value={formData.nickname}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="닉네임을 입력하세요"
                  required
                  minLength={2}
                  maxLength={10}
                />
                <p className="text-xs text-gray-500 mt-1">2-10자 이내로 입력해주세요</p>
              </div>

              {/* 읽기 전용 정보 (API에서 제공하지만 수정 불가) */}
              {user && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      이메일
                    </label>
                    <input
                      type="email"
                      value={user.email || ''}
                      disabled
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 text-gray-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">이메일은 수정할 수 없습니다</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      이름
                    </label>
                    <input
                      type="text"
                      value={user.name || ''}
                      disabled
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 text-gray-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">이름은 수정할 수 없습니다</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 버튼 영역 */}
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={isLoading || isUpdating || !memberId}
              className="flex-1 bg-gradient-to-r from-gray-900 to-gray-800 text-white py-3 px-6 rounded-lg hover:from-black hover:to-gray-900 disabled:opacity-50 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
            >
              {isUpdating ? '저장 중...' : '정보 수정'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/mypage', { state: { activeTab: 'account' } })}
              className="flex-1 bg-white/80 text-gray-700 py-3 px-6 rounded-lg hover:bg-white transition-all duration-200 border border-gray-300 font-medium"
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserInfoEditor;
