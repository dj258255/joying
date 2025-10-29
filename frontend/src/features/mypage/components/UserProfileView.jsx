/**
 * UserProfileView Component
 * 회원 정보 조회 컴포넌트
 */

import React from 'react';
import ProfileImage from '../../../shared/components/ProfileImage';
import { DUMMY_USERS } from '../../../shared/constants/dummyData';

const UserProfileView = () => {
  // 더미 데이터에서 현재 사용자 정보 가져오기
  const userProfile = DUMMY_USERS.currentUser;
  
  // 활동 기간 계산
  const getActivityDays = () => {
    const createdAt = new Date(userProfile.createdAt);
    const now = new Date();
    const diffTime = Math.abs(now - createdAt);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // 성별 텍스트 변환
  const getGenderText = (gender) => {
    return gender === 'male' ? '남성' : '여성';
  };

  // 나이 계산
  const getAge = (birth) => {
    const birthDate = new Date(birth);
    const now = new Date();
    let age = now.getFullYear() - birthDate.getFullYear();
    const monthDiff = now.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="p-6">
      {/* 헤더 섹션 */}
      <div className="glass-profile-header p-6 mb-6">
        <div className="flex items-center space-x-4">
          <ProfileImage 
            src={userProfile.profileImageUrl}
            alt={userProfile.username}
            size={64}
            className="w-16 h-16"
          />
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{userProfile.username}</h3>
            <div className="flex items-center space-x-4">
              <div className="glass-rating-badge">
                <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-sm font-semibold text-gray-900">{userProfile.rating}</span>
              </div>
              <div className="glass-status-badge glass-status-verified">
                {userProfile.isVerified ? '인증완료' : '미인증'}
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
            <div className="glass-info-item">
              <span className="glass-info-label">이메일</span>
              <span className="glass-info-value">{userProfile.email}</span>
            </div>
            <div className="glass-info-item">
              <span className="glass-info-label">성별</span>
              <span className="glass-info-value">{getGenderText(userProfile.gender)}</span>
            </div>
            <div className="glass-info-item">
              <span className="glass-info-label">나이</span>
              <span className="glass-info-value">{getAge(userProfile.birth)}세</span>
            </div>
            <div className="glass-info-item">
              <span className="glass-info-label">생년월일</span>
              <span className="glass-info-value">{userProfile.birth}</span>
            </div>
            <div className="glass-info-item">
              <span className="glass-info-label">활동 기간</span>
              <span className="glass-info-value">{getActivityDays()}일째 활동중</span>
            </div>
            <div className="glass-info-item">
              <span className="glass-info-label">자기소개</span>
              <span className="glass-info-value">{userProfile.bio || '자기소개가 없습니다.'}</span>
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
