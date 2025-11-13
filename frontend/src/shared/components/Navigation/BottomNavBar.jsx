/**
 * BottomNavBar Component
 * 모바일 전용 하단 네비게이션 바
 */

import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { FiHome, FiSearch, FiPlusCircle, FiMessageSquare, FiUser } from 'react-icons/fi';
import NavButton from './NavButton';
import { useUnreadCount } from '@/features/chat/hooks/useUnreadCount';

const BottomNavBar = () => {
  const location = useLocation();
  const { unreadCount } = useUnreadCount();

  // 네비게이션 바를 숨길 경로들
  const hideNavRoutes = ['/login', '/signup', '/checkout'];
  const shouldShow = !hideNavRoutes.some(route => location.pathname.startsWith(route));

  // 네비게이션 아이템 정의
  const navItems = useMemo(() => [
    {
      id: 'home',
      icon: FiHome,
      label: '홈',
      path: '/',
      isActive: location.pathname === '/'
    },
    {
      id: 'products',
      icon: FiSearch,
      label: '검색',
      path: '/products',
      isActive: location.pathname.startsWith('/products') && !location.pathname.includes('/create')
    },
    {
      id: 'create',
      icon: FiPlusCircle,
      label: '등록',
      path: '/products/create',
      isActive: location.pathname === '/products/create',
      isCenter: true
    },
    {
      id: 'chats',
      icon: FiMessageSquare,
      label: '채팅',
      path: '/chats',
      isActive: location.pathname.startsWith('/chats'),
      badge: unreadCount
    },
    {
      id: 'mypage',
      icon: FiUser,
      label: 'MY',
      path: '/mypage',
      isActive: location.pathname.startsWith('/mypage')
    }
  ], [location.pathname, unreadCount]);

  if (!shouldShow) return null;

  return (
    <>
      {/* 하단 네비게이션 바 */}
      <nav className="fixed bottom-0 left-0 right-0 z-[9999] lg:hidden bg-white border-t border-gray-200 shadow-lg">
        <div className="flex justify-around items-center h-16 max-w-screen-sm mx-auto px-2">
          {navItems.map((item) => (
            <NavButton
              key={item.id}
              icon={item.icon}
              label={item.label}
              path={item.path}
              isActive={item.isActive}
              isCenter={item.isCenter}
              badge={item.badge}
            />
          ))}
        </div>

        {/* iOS 안전 영역 대응 */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>

      {/* 하단 여백 확보 (콘텐츠가 네비게이션에 가려지지 않도록) */}
      <div className="h-16 lg:hidden" />
    </>
  );
};

export default BottomNavBar;

