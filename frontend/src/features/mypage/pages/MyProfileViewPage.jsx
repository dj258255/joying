/**
 * MyProfileViewPage
 * 회원 정보 조회 페이지
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import SideNavbar from '@/shared/components/Navbar/SideNavbar';
import UserProfileView from '../components/UserProfileView';
import { FiArrowLeft } from 'react-icons/fi';

const MyProfileViewPage = () => {
  const navigate = useNavigate();

  return (
    <>
      <SideNavbar />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          {/* 뒤로가기 버튼 */}
          <button
            onClick={() => navigate('/mypage')}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-white/50 rounded-lg transition-all duration-200 mb-4"
          >
            <FiArrowLeft className="w-5 h-5" />
            <span className="font-medium">마이페이지로 돌아가기</span>
          </button>

          {/* 회원 정보 컴포넌트 */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50">
            <UserProfileView />
          </div>
        </div>
      </div>
    </>
  );
};

export default MyProfileViewPage;

