/**
 * UserInfoEditor Component
 * 회원 정보 수정 컴포넌트
 */

import React, { useState } from 'react';

const UserInfoEditor = () => {
  const [formData, setFormData] = useState({
    nickname: '김대여',
    email: 'kim@example.com',
    phone: '010-1234-5678',
    address: '서울시 강남구 테헤란로 123',
    bio: '안녕하세요! 다양한 물품을 대여하고 있습니다.'
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    // 실제 API 호출 시뮬레이션
    setTimeout(() => {
      setIsLoading(false);
      alert('회원 정보가 수정되었습니다.');
    }, 1000);
  };

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-4 lg:mb-6">
        <h2 className="text-xl lg:text-2xl font-bold text-gray-900">회원 정보 수정</h2>
        <p className="text-gray-600 mt-1 text-sm lg:text-base">나의 회원 정보를 수정하세요</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 lg:p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 닉네임 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                닉네임 *
              </label>
              <input
                type="text"
                name="nickname"
                value={formData.nickname}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="닉네임을 입력하세요"
                required
              />
              <p className="text-xs text-gray-500 mt-1">2-10자 이내로 입력해주세요</p>
            </div>

            {/* 이메일 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                이메일 *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="이메일을 입력하세요"
                required
              />
              <p className="text-xs text-gray-500 mt-1">이메일 형식으로 입력해주세요</p>
            </div>

            {/* 전화번호 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                전화번호
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="010-1234-5678"
              />
              <p className="text-xs text-gray-500 mt-1">하이픈(-)을 포함하여 입력해주세요</p>
            </div>

            {/* 주소 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                주소
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="주소를 입력하세요"
              />
              <p className="text-xs text-gray-500 mt-1">대여 시 참고할 주소입니다</p>
            </div>
          </div>

          {/* 자기소개 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              자기소개
            </label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="자기소개를 입력하세요"
            />
            <p className="text-xs text-gray-500 mt-1">다른 사용자에게 보여질 자기소개입니다</p>
          </div>

          {/* 버튼 영역 */}
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? '저장 중...' : '정보 수정'}
            </button>
            <button
              type="button"
              className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
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
