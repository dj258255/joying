/**
 * MyPageLayout Component
 * 마이페이지 레이아웃 컴포넌트
 */

import React from 'react';
import { Outlet } from 'react-router-dom';
import MyPageMenu from '../components/MyPageMenu';

const MyPageLayout = () => {
  const handleMenuClick = (path) => {
    // TODO: 라우터 네비게이션
    console.log('메뉴 클릭:', path);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 사이드바 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                마이페이지
              </h2>
              <MyPageMenu onMenuClick={handleMenuClick} />
            </div>
          </div>

          {/* 메인 콘텐츠 */}
          <div className="lg:col-span-3">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyPageLayout;
