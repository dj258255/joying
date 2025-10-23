/**
 * MyPageMain Component
 * 스크롤리스 환경의 시안 블루(#007ACC) 글래스모피즘 디자인
 */

import React, { useState, useEffect } from 'react';
import { 
  FiPackage, 
  FiUsers, 
  FiEdit3, 
  FiHeart, 
  FiMessageCircle, 
  FiUser, 
  FiSettings, 
  FiCamera, 
  FiCreditCard, 
  FiTrash2,
  FiChevronRight,
  FiGrid,
  FiUserCheck,
  FiActivity,
  FiTrendingUp,
  FiShield,
  FiEdit,
  FiBell,
  FiMoreVertical,
  FiHome,
  FiShoppingBag,
  FiLock,
  FiX,
  FiCheck,
  FiAlertTriangle
} from 'react-icons/fi';

// Tier 1: 프로필 & 실시간 활동 대시보드
import UserProfileView from '../components/UserProfileView';
import ProfileImageManager from '../components/ProfileImageManager';
import MyChatRoomsList from '../components/MyChatRoomsList';

// Tier 2: 상품 관리 및 상세 활동 목록
import BorrowedHistoryList from '../components/BorrowedHistoryList';
import LentHistoryList from '../components/LentHistoryList';
import RegisteredProductList from '../components/RegisteredProductList';
import LikedProductList from '../components/LikedProductList';

// Tier 3: 계정 관리 및 보안
import UserInfoEditor from '../components/UserInfoEditor';
import AccountVerifyForm from '../components/AccountVerifyForm';
import UserDeletePage from '../components/UserDeletePage';

const MyPageMain = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState(null);
  const [isWarningModal, setIsWarningModal] = useState(false);

  // 사이드바는 고정이므로 스크롤 이벤트 제거

  // 탭 구성
  const tabs = [
    {
      id: 'dashboard',
      label: '대시보드',
      icon: FiHome,
      tier: 1
    },
    {
      id: 'products',
      label: '상품 관리',
      icon: FiShoppingBag,
      tier: 2
    },
    {
      id: 'account',
      label: '계정 관리',
      icon: FiLock,
      tier: 3
    }
  ];

  // 모달 열기 함수
  const openModal = (content, isWarning = false) => {
    setModalContent(content);
    setIsWarningModal(isWarning);
    setShowModal(true);
  };

  // 모달 닫기 함수
  const closeModal = () => {
    setShowModal(false);
    setModalContent(null);
    setIsWarningModal(false);
  };

  // 탭 전환 애니메이션
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'products':
        return <ProductsView />;
      case 'account':
        return <AccountView openModal={openModal} />;
      default:
        return <DashboardView />;
    }
  };

  // Tier 1: 대시보드 뷰 컴포넌트 - 미니멀리즘 디자인
  const DashboardView = () => (
    <div className="glass-scroll-container h-full p-6 space-y-6">
      {/* 프로필 섹션 - 미니멀 글래스 */}
      <div className="glass-profile-minimal p-6">
        <UserProfileView />
      </div>

      {/* 활동 대시보드 - 통일된 색상 톤 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card-minimal p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-1">진행 중인 대여</p>
              <p className="text-2xl font-bold text-gray-900">3</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
              <FiPackage className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="glass-card-minimal p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-1">빌려준 상품</p>
              <p className="text-2xl font-bold text-gray-900">7</p>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center">
              <FiUsers className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="glass-card-minimal p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-1">등록한 상품</p>
              <p className="text-2xl font-bold text-gray-900">12</p>
            </div>
            <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center">
              <FiEdit3 className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
        
        <div className="glass-card-minimal p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-1">채팅방</p>
              <p className="text-2xl font-bold text-gray-900">5</p>
              <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mt-1">3</span>
            </div>
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
              <FiMessageCircle className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
        </div>
      </div>

      {/* 최근 활동 - 미니멀 디자인 */}
      <div className="glass-main-minimal p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">최근 활동</h3>
        <div className="space-y-3">
          <div className="glass-activity-item p-4">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-700">새로운 대여 요청이 도착했습니다</span>
              <span className="text-xs text-gray-500 ml-auto">2분 전</span>
            </div>
          </div>
          <div className="glass-activity-item p-4">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-700">대여가 완료되었습니다</span>
              <span className="text-xs text-gray-500 ml-auto">1시간 전</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Tier 2: 상품 관리 뷰 - 미니멀리즘 디자인
  const ProductsView = () => {
    const [activeSubTab, setActiveSubTab] = useState('registered');
    
    const subTabs = [
      { id: 'registered', label: '등록한 상품', icon: FiEdit3 },
      { id: 'liked', label: '관심 상품', icon: FiHeart },
      { id: 'borrowed', label: '빌린 내역', icon: FiPackage },
      { id: 'lent', label: '빌려준 내역', icon: FiUsers }
    ];

    return (
      <div className="glass-scroll-container h-full p-6 space-y-6">
        {/* 서브 탭 네비게이션 - 미니멀 디자인 */}
        <div className="glass-tabs-minimal p-4">
          <div className="flex space-x-1 overflow-x-auto">
            {subTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex-shrink-0 flex items-center space-x-2 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200 ${
                  activeSubTab === tab.id
                    ? 'glass-subtab-minimal-active'
                    : 'glass-subtab-minimal-inactive'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 서브 탭 콘텐츠 - 미니멀 컨테이너 */}
        <div className="glass-content-minimal p-6 glass-scroll-container" style={{ height: 'calc(100vh - 180px)' }}>
          {activeSubTab === 'registered' && <RegisteredProductList />}
          {activeSubTab === 'liked' && <LikedProductList />}
          {activeSubTab === 'borrowed' && <BorrowedHistoryList />}
          {activeSubTab === 'lent' && <LentHistoryList />}
        </div>
      </div>
    );
  };

  // Tier 3: 계정 관리 뷰 - 미니멀리즘 디자인
  const AccountView = ({ openModal }) => {
    const accountItems = [
      {
        id: 'profile',
        label: '회원 정보',
        icon: FiUser,
        description: '회원 정보 조회',
        action: () => openModal(<UserProfileView />)
      },
      {
        id: 'edit',
        label: '정보 수정',
        icon: FiEdit,
        description: '회원 정보 수정',
        action: () => openModal(<UserInfoEditor />)
      },
      {
        id: 'image',
        label: '프로필 이미지',
        icon: FiCamera,
        description: '프로필 이미지 관리',
        action: () => openModal(<ProfileImageManager />)
      },
      {
        id: 'verify',
        label: '계좌 인증',
        icon: FiShield,
        description: '계좌 인증',
        badge: '인증 필요',
        action: () => openModal(<AccountVerifyForm />)
      },
      {
        id: 'delete',
        label: '회원 탈퇴',
        icon: FiTrash2,
        description: '회원 탈퇴',
        isDanger: true,
        action: () => openModal(<UserDeletePage />, true)
      }
    ];

    return (
      <div className="glass-scroll-container h-full p-6 space-y-4">
        {accountItems.map((item) => (
          <button
            key={item.id}
            onClick={item.action}
            className={`w-full glass-account-item p-5 text-left glass-hover-lift ${
              item.isDanger ? 'glass-account-item-danger' : 'glass-account-item-normal'
            }`}
          >
            <div className="flex items-center space-x-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                item.isDanger ? 'bg-red-50' : 'bg-gray-50'
              }`}>
                <item.icon className={`w-6 h-6 ${
                  item.isDanger ? 'text-red-600' : 'text-gray-600'
                }`} />
              </div>
              <div className="flex-1">
                <h3 className={`font-semibold text-lg ${
                  item.isDanger ? 'text-red-900' : 'text-gray-900'
                }`}>
                  {item.label}
                </h3>
                <p className={`text-sm mt-1 ${
                  item.isDanger ? 'text-red-600' : 'text-gray-500'
                }`}>
                  {item.description}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                {item.badge && (
                  <span className="glass-badge-minimal text-xs">
                    {item.badge}
                  </span>
                )}
                <FiChevronRight className={`w-5 h-5 ${
                  item.isDanger ? 'text-red-400' : 'text-gray-400'
                }`} />
              </div>
            </div>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="glass-viewport bg-gradient-to-br from-gray-50 via-white to-gray-100/50">
      {/* 좌측 사이드바 - 미니멀 디자인 */}
      <div className="hidden lg:block fixed left-0 top-0 h-full w-64 z-40">
        <div className="glass-sidebar-minimal h-full p-6">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">마이페이지</h1>
          </div>
          
          <div className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl font-medium transition-all duration-200 text-left ${
                  activeTab === tab.id
                    ? 'glass-tab-minimal-active'
                    : 'glass-tab-minimal-inactive'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 모바일 헤더 */}
      <div className="lg:hidden glass-nav sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">마이페이지</h1>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-[#007ACC] to-[#007ACC]/80 rounded-full flex items-center justify-center glass-avatar-ring">
                <FiUser className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 - 사이드바 공간 고려 */}
      <div className="lg:ml-64 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-12 h-full">
        {/* 데스크톱 헤더 */}


        {/* 모바일 탭 선택 */}
        <div className="lg:hidden mb-6">
          <div className="glass-main p-3">
            <div className="flex space-x-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'glass-tab-active'
                      : 'glass-tab-inactive'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 탭 콘텐츠 - 스크롤리스 컨테이너 */}
        <div className="glass-main h-[calc(86vh-70px)] lg:h-[calc(100vh-70px)]">
          {renderTabContent()}
        </div>
      </div>


      {/* 미니멀 글래스모피즘 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* 미세한 블러 오버레이 */}
          <div 
            className={`absolute inset-0 backdrop-blur-sm ${
              isWarningModal 
                ? 'bg-red-500/5' 
                : 'bg-gray-500/10'
            }`}
            onClick={closeModal}
          />
          
          {/* 미니멀 모달 컨테이너 */}
          <div className={`relative backdrop-blur-lg border rounded-3xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-hidden ${
            isWarningModal
              ? 'bg-red-50/60 border-red-200/20'
              : 'bg-white/70 border-white/20'
          }`}>
            {/* 모달 헤더 */}
            <div className={`backdrop-blur-sm border-b px-6 py-5 ${
              isWarningModal
                ? 'bg-red-100/40 border-red-200/10'
                : 'bg-white/50 border-white/10'
            }`}>
              <div className="flex items-center justify-between">
                <h2 className={`text-xl font-semibold ${
                  isWarningModal ? 'text-red-900' : 'text-gray-900'
                }`}>
                  {isWarningModal ? '회원 탈퇴' : '계정 관리'}
                </h2>
                <button
                  onClick={closeModal}
                  className={`p-2 rounded-xl transition-all duration-200 hover:scale-105 ${
                    isWarningModal
                      ? 'bg-red-200/30 hover:bg-red-200/50'
                      : 'bg-gray-100/50 hover:bg-gray-100/70'
                  }`}
                >
                  <FiX className={`w-5 h-5 ${
                    isWarningModal ? 'text-red-600' : 'text-gray-600'
                  }`} />
                </button>
              </div>
            </div>
            
            {/* 모달 콘텐츠 */}
            <div className="p-6 glass-scroll-container max-h-[calc(85vh-100px)]">
              {modalContent}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyPageMain;