import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import ProfileImage from '../ProfileImage';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useChatRooms } from '@/features/chat/hooks/useChatRooms';

const SideNavbar = ({ isOpen = false, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const { totalUnreadCount } = useChatRooms();
  
  // 채팅방 페이지에서 navbar 호버 비활성화 여부 확인
  const isChatRoom = location.pathname.startsWith('/chats/');
  
  // 채팅방에서 특정 영역의 호버를 비활성화하는 함수
  const handleMouseEnter = (e) => {
    if (isChatRoom) {
      // 마우스 위치 확인
      const mouseY = e.clientY;
      const windowHeight = window.innerHeight;
      
      // 상단 100px 영역 (헤더) 또는 하단 150px 영역 (메시지 입력)에서 호버 비활성화
      if (mouseY < 100 || mouseY > windowHeight - 150) {
        return; // 호버 비활성화
      }
    }
    setIsVisible(true);
  };
  
  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  // 로그아웃 처리
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  const navItems = [
    {
      id: 'home',
      name: '홈',
      path: '/',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      id: 'products',
      name: '상품',
      path: '/products',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      )
    },
    {
      id: 'mypage',
      name: '마이페이지',
      path: '/mypage',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
    {
      id: 'chat',
      name: '채팅',
      path: '/chats',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      )
    }
  ];

  // 인증되지 않은 경우 navbar 숨기기 (홈페이지 제외)
  if (!isAuthenticated && location.pathname !== '/') {
    return null;
  }

  return (
    <>
      {/* 배경 오버레이 */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[9998] transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* 네비게이션 바 */}
      <div 
        className={`fixed top-0 right-0 h-screen w-80 z-[9999] transition-all duration-300 transform ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.9))',
          backdropFilter: 'blur(20px)',
          borderLeft: '1px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div className="flex flex-col h-full">
          {/* 헤더 - 닫기 버튼 */}
          <div className="flex items-center justify-between p-6 border-b border-white/20">
            <h2 className="text-xl font-bold text-gray-800">메뉴</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/50 transition-colors"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 프로필 섹션 */}
          <div className="flex-shrink-0 p-6 border-b border-white/20">
            <div className="flex items-center space-x-4">
              <ProfileImage 
                src={user?.profileImageUrl}
                alt={user?.nickname || "사용자"}
                size={48}
                className="w-12 h-12"
              />
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  {user?.nickname || "사용자"}
                </h3>
                <p className="text-sm text-gray-600">
                  {user?.email || "user@example.com"}
                </p>
              </div>
            </div>
          </div>

          {/* 네비게이션 메뉴 - 스크롤 가능 */}
          <div className="flex-1 min-h-0 overflow-y-auto py-6">
            <nav className="space-y-2">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                const hasUnreadChat = item.id === 'chat' && totalUnreadCount > 0;
                // 활성화된 상태가 아닐 때만 알림 표시
                const showUnreadBadge = hasUnreadChat && !isActive;
                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    onClick={onClose}
                    className={`flex items-center space-x-3 px-6 py-3 mx-4 rounded-xl transition-all duration-200 relative ${
                      isActive
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-700 hover:bg-white/50 hover:text-gray-900'
                    }`}
                  >
                    <div className={`${isActive ? 'text-white' : 'text-gray-500'}`}>
                      {item.icon}
                    </div>
                    <span className="font-medium">{item.name}</span>
                    {isActive && (
                      <div className="ml-auto w-2 h-2 bg-white rounded-full"></div>
                    )}
                    {showUnreadBadge && (
                      <div className="ml-auto relative flex items-center justify-center">
                        {/* 깜빡이는 빨간 점 */}
                        <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-blink"></div>
                      </div>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* 하단 액션 버튼들 - 항상 하단에 고정 */}
          <div className="flex-shrink-0 p-6 border-t border-white/20 space-y-3 bg-white/30">
            {/* 로그아웃 버튼 */}
            {isAuthenticated && (
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-3 px-4 py-3 text-red-600 bg-white hover:bg-red-50 rounded-xl transition-all duration-200 font-medium shadow-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>로그아웃</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default SideNavbar;
