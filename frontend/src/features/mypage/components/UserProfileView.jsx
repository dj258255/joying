/**
 * UserProfileView Component
 * 회원 정보 조회 컴포넌트
 */

import React from 'react';

const UserProfileView = () => {
  // 더미 데이터
  const userProfile = {
    id: 'user123',
    nickname: '김대여',
    email: 'kim@example.com',
    phone: '010-1234-5678',
    profileImage: 'https://via.placeholder.com/150x150/4F46E5/FFFFFF?text=김대여',
    joinDate: '2024-01-01',
    accountVerified: true,
    bankName: '국민은행',
    accountNumber: '123-456-789012',
    accountHolder: '김대여',
    rating: 4.8,
    totalRentals: 15,
    totalLent: 8
  };

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-4 lg:mb-6">
        <h2 className="text-xl lg:text-2xl font-bold text-gray-900">회원 정보</h2>
        <p className="text-gray-600 mt-1 text-sm lg:text-base">나의 회원 정보를 확인하세요</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 lg:p-6">
        {/* 프로필 이미지 및 기본 정보 */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6 mb-6">
          <div className="flex-shrink-0">
            <img
              src={userProfile.profileImage}
              alt="프로필 이미지"
              className="w-20 h-20 lg:w-24 lg:h-24 rounded-full object-cover border-2 border-gray-200"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg lg:text-xl font-semibold text-gray-900">{userProfile.nickname}</h3>
            <p className="text-sm text-gray-600 mt-1">{userProfile.email}</p>
            <div className="flex items-center space-x-4 mt-2">
              <div className="flex items-center space-x-1">
                <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-sm font-medium text-gray-900">{userProfile.rating}</span>
              </div>
              <span className="text-sm text-gray-500">가입일: {userProfile.joinDate}</span>
            </div>
          </div>
        </div>

        {/* 상세 정보 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 연락처 정보 */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900">연락처 정보</h4>
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4">
                <span className="text-sm font-medium text-gray-600 w-20">이메일:</span>
                <span className="text-sm text-gray-900">{userProfile.email}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4">
                <span className="text-sm font-medium text-gray-600 w-20">전화번호:</span>
                <span className="text-sm text-gray-900">{userProfile.phone}</span>
              </div>
            </div>
          </div>

          {/* 계좌 정보 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-900">계좌 정보</h4>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                userProfile.accountVerified 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {userProfile.accountVerified ? '인증완료' : '미인증'}
              </span>
            </div>
            {userProfile.accountVerified ? (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4">
                  <span className="text-sm font-medium text-gray-600 w-20">은행:</span>
                  <span className="text-sm text-gray-900">{userProfile.bankName}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4">
                  <span className="text-sm font-medium text-gray-600 w-20">계좌번호:</span>
                  <span className="text-sm text-gray-900">{userProfile.accountNumber}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4">
                  <span className="text-sm font-medium text-gray-600 w-20">예금주:</span>
                  <span className="text-sm text-gray-900">{userProfile.accountHolder}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">계좌 인증이 필요합니다.</p>
            )}
          </div>
        </div>

        {/* 활동 통계 */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">활동 통계</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{userProfile.totalRentals}</div>
              <div className="text-sm text-gray-600">대여한 횟수</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{userProfile.totalLent}</div>
              <div className="text-sm text-gray-600">대여해준 횟수</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfileView;
