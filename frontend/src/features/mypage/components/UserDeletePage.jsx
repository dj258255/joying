/**
 * UserDeletePage Component
 * 회원 탈퇴 페이지 컴포넌트
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useUserProfile } from '@/features/user/hooks/useUserProfile';

const UserDeletePage = () => {
  const navigate = useNavigate();
  const { user: currentUser, logout } = useAuth();
  const memberId = currentUser?.memberId || currentUser?.id;
  const { deleteUser, isDeleting } = useUserProfile(memberId);
  
  const [confirmText, setConfirmText] = useState('');
  const [agreed, setAgreed] = useState(false);

  const handleConfirm = async () => {
    if (confirmText !== '탈퇴하겠습니다') {
      alert('정확한 문구를 입력해주세요.');
      return;
    }

    if (!agreed) {
      alert('탈퇴 동의에 체크해주세요.');
      return;
    }

    if (!memberId) {
      alert('로그인이 필요합니다.');
      return;
    }

    if (!window.confirm('정말로 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    try {
      const response = await deleteUser();
      // API 응답 메시지 표시 (있는 경우)
      const successMessage = response?.message || '회원 탈퇴가 완료되었습니다.';
      alert(successMessage);
      // 로그아웃 처리 및 로그인 페이지로 리다이렉트
      await logout();
      navigate('/login');
    } catch (error) {
      
      const errorMessage = error.response?.data?.message || error.message || '회원 탈퇴에 실패했습니다.';
      alert(errorMessage);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">회원 탈퇴</h2>
        <p className="text-gray-600 mt-2 text-sm">회원 탈퇴를 진행하시겠습니까?</p>
      </div>

      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 p-6">

        {/* 경고 메시지 */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-red-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-red-800">탈퇴 시 주의사항</h4>
              <ul className="text-sm text-red-700 mt-2 space-y-1">
                <li>• 모든 대여 내역이 삭제됩니다</li>
                <li>• 등록한 상품이 모두 삭제됩니다</li>
                <li>• 채팅 내역이 모두 삭제됩니다</li>
                <li>• 탈퇴 후 복구가 불가능합니다</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 확인 입력 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            탈퇴 확인
          </label>
          <p className="text-sm text-gray-600 mb-3">
            아래 문구를 정확히 입력해주세요: <span className="font-semibold text-gray-900">탈퇴하겠습니다</span>
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
            placeholder="탈퇴하겠습니다"
          />
        </div>

        {/* 동의 체크박스 */}
        <div className="mb-6">
          <label className="flex items-start space-x-3">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
            />
            <span className="text-sm text-gray-700">
              위 내용을 모두 확인했으며, 회원 탈퇴에 동의합니다.
            </span>
          </label>
        </div>

        {/* 버튼 영역 */}
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-4 border-t border-gray-200">
          <button
            onClick={handleConfirm}
            disabled={isDeleting || confirmText !== '탈퇴하겠습니다' || !agreed || !memberId}
            className="flex-1 bg-gradient-to-r from-gray-700 to-gray-600 text-white py-3 px-6 rounded-lg hover:from-gray-800 hover:to-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg font-medium"
          >
            {isDeleting ? '탈퇴 처리 중...' : '회원 탈퇴'}
          </button>
          <button
            onClick={() => window.history.back()}
            className="flex-1 bg-white/80 text-gray-700 py-3 px-6 rounded-lg hover:bg-white transition-all duration-200 border border-gray-300 font-medium"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserDeletePage;
