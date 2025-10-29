/**
 * SellerProfile Component
 * 판매자 정보 컴포넌트
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileImage from '../../../shared/components/ProfileImage';
import { DUMMY_USERS } from '../../../shared/constants/dummyData';

const SellerProfile = ({ seller = {}, sellerId }) => {
  const navigate = useNavigate();
  
  const {
    nickname = '판매자',
    profileImage,
    rating = 4.9,
    reviewCount = 128,
    isPhoneVerified = true,
    isBusinessVerified = false
  } = seller;

  const handleProfileClick = () => {
    if (sellerId) {
      // 현재 사용자의 상품인 경우 마이페이지로 이동
      if (sellerId === DUMMY_USERS.currentUser.id) {
        navigate('/mypage');
      } else {
        // 다른 사용자의 상품인 경우 상대방 프로필 페이지로 이동
        navigate(`/members/${sellerId}`);
      }
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <h3 className="text-lg md:text-xl font-bold text-gray-900">판매자 정보</h3>

      {/* 판매자 기본 정보 */}
      <div 
        className="flex items-center space-x-3 md:space-x-4 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={handleProfileClick}
      >
        <ProfileImage 
          src={profileImage}
          alt={nickname}
          size={64}
          className="w-12 h-12 md:w-16 md:h-16"
        />
        <div>
          <div className="font-semibold text-base md:text-lg text-gray-900 flex items-center gap-2">
            {nickname}
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <div className="flex items-center space-x-2 mt-1">
            <span className="text-xl md:text-2xl font-extrabold text-blue-600">{rating}</span>
            <svg className="w-4 h-4 md:w-5 md:h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-xs md:text-sm text-gray-600">리뷰 {reviewCount}개</span>
          </div>
        </div>
      </div>

      {/* 인증 뱃지 */}
      <div className="flex flex-wrap gap-2">
        {isBusinessVerified && (
          <span
            className="flex-shrink-0 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium"
            style={{
              background: 'rgba(0, 122, 204, 0.1)',
              color: '#007ACC',
              border: '1px solid rgba(0, 122, 204, 0.3)'
            }}
          >
            ✓ 사업자 인증
          </span>
        )}
      </div>
    </div>
  );
};

export default SellerProfile;
