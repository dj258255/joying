/**
 * MyPageMenu Component
 * 마이페이지 메뉴 컴포넌트
 */

import React from 'react';
import { useLocation } from 'react-router-dom';

/**
 * @param {Object} props
 * @param {Function} props.onMenuClick - 메뉴 클릭 핸들러
 * @param {string} props.className - 추가 CSS 클래스
 */
const MyPageMenu = ({ onMenuClick, className = '' }) => {
  const location = useLocation();

  const menuItems = [
    {
      id: 'dashboard',
      label: '대시보드',
      icon: '📊',
      path: '/mypage',
      description: '전체 현황 보기'
    },
    {
      id: 'rent-history',
      label: '대여 내역',
      icon: '📦',
      path: '/mypage/rent-history',
      description: '내가 대여한 상품들'
    },
    {
      id: 'lent-history',
      label: '대여해준 내역',
      icon: '🤝',
      path: '/mypage/lent-history',
      description: '내가 대여해준 상품들'
    },
    {
      id: 'registered-products',
      label: '등록 상품',
      icon: '📝',
      path: '/mypage/registered-products',
      description: '내가 등록한 상품 관리'
    },
    {
      id: 'liked-products',
      label: '찜한 상품',
      icon: '❤️',
      path: '/mypage/liked-products',
      description: '찜한 상품 목록'
    },
    {
      id: 'profile',
      label: '프로필',
      icon: '👤',
      path: '/mypage/profile',
      description: '내 정보 관리'
    },
    {
      id: 'account-verify',
      label: '계좌 인증',
      icon: '🏦',
      path: '/mypage/account-verify',
      description: '계좌 인증 관리'
    }
  ];

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className={`space-y-2 ${className}`}>
      {menuItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onMenuClick(item.path)}
          className={`
            w-full flex items-center space-x-3 p-4 rounded-lg text-left transition-colors
            ${isActive(item.path)
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'text-gray-700 hover:bg-gray-50'
            }
          `}
        >
          <span className="text-2xl">{item.icon}</span>
          <div className="flex-1">
            <div className="font-medium">{item.label}</div>
            <div className="text-sm text-gray-500">{item.description}</div>
          </div>
          {isActive(item.path) && (
            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </button>
      ))}
    </nav>
  );
};

export default MyPageMenu;
