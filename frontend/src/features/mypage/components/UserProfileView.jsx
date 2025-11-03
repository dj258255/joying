/**
 * UserProfileView Component
 * 회원 정보 조회 컴포넌트
 */

import React from 'react';
import ProfileImage from '../../../shared/components/ProfileImage';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useUserProfile } from '@/features/user/hooks/useUserProfile';

const UserProfileView = () => {
  // 현재 로그인한 사용자 정보 가져오기
  const { user: currentUser } = useAuth();
  const memberId = currentUser?.memberId || currentUser?.id;
  
  // 회원 정보 조회 API 사용 (useUserProfile 훅 사용)
  const { user: userProfile, isLoading } = useUserProfile(memberId);
  
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <p className="text-gray-500">회원 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <p className="text-red-500">회원 정보를 불러올 수 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* 헤더 섹션 */}
      <div className="glass-profile-header p-6 mb-6">
        <div className="flex items-center space-x-4">
          <ProfileImage 
            src={userProfile.profileImageUrl}
            alt={userProfile.nickname}
            size={64}
            className="w-16 h-16"
          />
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{userProfile.nickname}</h3>
            <div className="flex items-center space-x-4">
              <div className="glass-rating-badge">
                <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-sm font-semibold text-gray-900">{userProfile.rating || 0}</span>
              </div>
              <div className="glass-status-badge glass-status-verified">
                {userProfile.verified ? '인증완료' : '미인증'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 정보 섹션들 */}
      <div className="space-y-4">
        {/* 기본 정보 */}
        <div className="glass-info-section p-5">
          <h4 className="glass-section-title">기본 정보</h4>
          <div className="space-y-3 mt-4">
            {userProfile.email && (
              <div className="glass-info-item">
                <span className="glass-info-label">이메일</span>
                <span className="glass-info-value">{userProfile.email}</span>
              </div>
            )}
            <div className="glass-info-item">
              <span className="glass-info-label">이름</span>
              <span className="glass-info-value">{userProfile.name || '-'}</span>
            </div>
            <div className="glass-info-item">
              <span className="glass-info-label">인증 상태</span>
              <span className="glass-info-value">{userProfile.verified ? '인증됨' : '미인증'}</span>
            </div>
          </div>
        </div>

        {/* 활동 통계 */}
        <div className="glass-info-section p-5">
          <h4 className="glass-section-title">활동 통계</h4>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="glass-stat-card">
              <div className="glass-stat-number">{userProfile.reviewCount}</div>
              <div className="glass-stat-label">받은 리뷰</div>
            </div>
            <div className="glass-stat-card">
              <div className="glass-stat-number">{userProfile.rating}</div>
              <div className="glass-stat-label">평점</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfileView;
