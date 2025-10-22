/**
 * MyPageMain Component
 * 마이페이지 메인 페이지 컴포넌트
 */

import React, { useState } from 'react';
import BorrowedHistoryList from '../components/BorrowedHistoryList';
import LentHistoryList from '../components/LentHistoryList';
import RegisteredProductsList from '../components/RegisteredProductsList';
import LikedProductsList from '../components/LikedProductsList';
import MyChatRoomsList from '../components/MyChatRoomsList';
import UserProfileView from '../components/UserProfileView';
import UserInfoEditor from '../components/UserInfoEditor';
import ProfileImageManager from '../components/ProfileImageManager';
import AccountVerifyForm from '../components/AccountVerifyForm';
import UserDeletePage from '../components/UserDeletePage';

const MyPageMain = () => {
  const [activeTab, setActiveTab] = useState('borrowed');

  const menuItems = [
    {
      id: 'borrowed',
      label: '내가 빌린 내역',
      icon: '📦',
      description: '대여한 상품 내역'
    },
    {
      id: 'lent',
      label: '내가 빌려준 내역',
      icon: '🤝',
      description: '대여해준 상품 내역'
    },
    {
      id: 'items',
      label: '등록한 상품',
      icon: '📋',
      description: '내가 등록한 상품 관리'
    },
    {
      id: 'likes',
      label: '관심 상품',
      icon: '❤️',
      description: '찜한 상품 목록'
    },
    {
      id: 'chats',
      label: '채팅방',
      icon: '💬',
      description: '내 채팅방 목록'
    },
    {
      id: 'profile',
      label: '회원 정보',
      icon: '👤',
      description: '회원 정보 조회'
    },
    {
      id: 'edit',
      label: '정보 수정',
      icon: '✏️',
      description: '회원 정보 수정'
    },
    {
      id: 'image',
      label: '프로필 이미지',
      icon: '📷',
      description: '프로필 이미지 관리'
    },
    {
      id: 'account',
      label: '계좌 인증',
      icon: '🏦',
      description: '계좌 인증'
    },
    {
      id: 'delete',
      label: '회원 탈퇴',
      icon: '🗑️',
      description: '회원 탈퇴'
    }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'borrowed':
        return <BorrowedHistoryList />;
      case 'lent':
        return <LentHistoryList />;
      case 'items':
        return <RegisteredProductsList />;
      case 'likes':
        return <LikedProductsList />;
      case 'chats':
        return <MyChatRoomsList />;
      case 'profile':
        return <UserProfileView />;
      case 'edit':
        return <UserInfoEditor />;
      case 'image':
        return <ProfileImageManager />;
      case 'account':
        return <AccountVerifyForm />;
      case 'delete':
        return <UserDeletePage />;
      default:
        return <BorrowedHistoryList />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 모바일 헤더 */}
      <div className="lg:hidden bg-white shadow-sm border-b">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">마이페이지</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-8">
        {/* 데스크톱 헤더 */}
        <div className="hidden lg:block mb-8">
          <h1 className="text-3xl font-bold text-gray-900">마이페이지</h1>
          <p className="mt-2 text-gray-600">나의 활동과 정보를 관리하세요</p>
        </div>

        {/* 모바일 탭 네비게이션 */}
        <div className="lg:hidden mb-6">
          <div className="bg-white rounded-lg shadow-sm p-2">
            <div className="flex overflow-x-auto space-x-2">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex-shrink-0 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === item.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
          {/* 데스크톱 사이드바 네비게이션 */}
          <div className="hidden lg:block lg:w-64">
            <nav className="bg-white rounded-lg shadow-sm p-4 sticky top-4">
              <ul className="space-y-2">
                {menuItems.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full block px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                        activeTab === item.id
                          ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-500 font-semibold'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-xl">{item.icon}</span>
                        <div>
                          <div className="font-medium">{item.label}</div>
                          <div className="text-sm text-gray-500">{item.description}</div>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* 메인 콘텐츠 영역 */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-sm min-h-[400px]">
              {renderTabContent()}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default MyPageMain;
