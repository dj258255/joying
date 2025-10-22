/**
 * Header Component
 * 헤더 컴포넌트
 */

import React from 'react';
import { useAuth } from '@/features/auth';

/**
 * @param {Object} props
 * @param {string} props.className - 추가 CSS 클래스
 */
const Header = ({ className = '' }) => {
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <header className={`bg-white shadow ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* 로고 */}
          <div className="flex items-center">
            <a href="/" className="flex items-center">
              <span className="text-2xl font-bold text-blue-600">Joying</span>
            </a>
          </div>

          {/* 네비게이션 */}
          <nav className="hidden md:flex space-x-8">
            <a href="/" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
              홈
            </a>
            <a href="/products" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
              상품
            </a>
            <a href="/chats" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
              채팅
            </a>
          </nav>

          {/* 사용자 메뉴 */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <a href="/mypage" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                  마이페이지
                </a>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 font-medium text-sm">
                      {user?.nickname?.charAt(0) || '?'}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    로그아웃
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <a href="/login" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                  로그인
                </a>
                <a href="/register" className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">
                  회원가입
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
