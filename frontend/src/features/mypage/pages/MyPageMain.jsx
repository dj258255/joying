/**
 * MyPageMain Component
 * 현대적인 대시보드 스타일 (멤버 페이지 디자인)
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DUMMY_CHAT_ROOMS } from '../../../shared/constants/dummyData';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useMyProducts } from '@/features/product/hooks/useMyProducts';
import { useLikedProducts } from '@/features/product/hooks/useLikedProducts';
import { 
  FiPackage, 
  FiHeart, 
  FiMessageCircle, 
  FiUser, 
  FiCamera, 
  FiTrash2,
  FiChevronRight,
  FiShield,
  FiEdit
} from 'react-icons/fi';

// 컴포넌트
import ProfileImage from '../../../shared/components/ProfileImage';
import BorrowedHistoryList from '../components/BorrowedHistoryList';
import LentHistoryList from '../components/LentHistoryList';
import RegisteredProductList from '../components/RegisteredProductList';
import LikedProductList from '../components/LikedProductList';

// 공통 네비게이션
import SideNavbar from '../../../shared/components/Navbar/SideNavbar';

const MyPageMain = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  // 데스크톱에서는 'products' 기본 선택, 모바일에서는 null
  const [activeTab, setActiveTab] = useState(() => {
    // 초기 렌더링 시 화면 크기에 따라 결정
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024 ? 'products' : null;
    }
    return null;
  });
  const [productTab, setProductTab] = useState('registered');
  const [reviewTab, setReviewTab] = useState('borrowed');
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  const currentUserId = currentUser?.memberId || currentUser?.id;
  
  // 등록한 상품 조회
  const { data: myProductsData, isLoading: isLoadingMyProducts } = useMyProducts({
    page: 0,
    size: 100, // 활동 통계용으로 충분한 수량
    sort: 'productId'
  });
  const userProducts = myProductsData?.content || [];

  // 찜한 상품 조회
  const { data: likedProductsData, isLoading: isLoadingLikedProducts } = useLikedProducts({
    page: 0,
    size: 100 // 활동 통계용으로 충분한 수량
  });
  const likedProducts = likedProductsData?.content || [];
  
  // 채팅방 수
  const chatRoomsCount = DUMMY_CHAT_ROOMS.length;

  // 별점 렌더링 함수
  const renderStarRating = (rating) => {
    const calcStarRates = () => {
      let tempStarRatesArr = [0, 0, 0, 0, 0];
      let starScore = rating;

      for (let i = 0; i < 5; i++) {
        if (starScore >= 1) {
          tempStarRatesArr[i] = 14;
          starScore -= 1;
        } else {
          tempStarRatesArr[i] = starScore * 14;
          break;
        }
      }

      return tempStarRatesArr;
    };

    const ratesResArr = calcStarRates();
    const STAR_IDX_ARR = ['first', 'second', 'third', 'fourth', 'last'];

    return STAR_IDX_ARR.map((item, idx) => {
      const clipId = `clip-${idx}-${rating}`;
      const pathId = `path-${idx}-${rating}`;

      return (
        <span key={`${item}_${idx}`}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={24}
            height={24}
            viewBox="0 0 14 13"
            fill="#cacaca"
          >
            <clipPath id={clipId}>
              <rect width={ratesResArr[idx]} height={24} />
            </clipPath>
            <path
              id={pathId}
              d="M9,2l2.163,4.279L16,6.969,12.5,10.3l.826,4.7L9,12.779,4.674,15,5.5,10.3,2,6.969l4.837-.69Z"
              transform="translate(-2 -2)"
            />
            <use
              clipPath={`url(#${clipId})`}
              href={`#${pathId}`}
              fill="#FFBF0F"
            />
          </svg>
        </span>
      );
    });
  };

  if (!currentUser) {
    return (
      <>
        <SideNavbar />
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <div className="text-center">
            <div className="text-gray-500 text-6xl mb-4">⚠️</div>
            <div className="text-gray-700 text-xl mb-6">로그인이 필요합니다.</div>
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-3 bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-xl hover:from-gray-900 hover:to-black transition-all duration-200 font-medium shadow-lg"
            >
              로그인하기
            </button>
          </div>
        </div>
      </>
    );
  }

    return (
    <>
      <SideNavbar />
      <div className={`bg-gradient-to-br from-gray-50 to-gray-100 ${activeTab === null ? 'lg:min-h-screen h-screen overflow-hidden' : 'min-h-screen'}`}>
        <div className={`flex flex-col lg:flex-row gap-4 lg:gap-6 px-4 sm:px-6 ${activeTab === null ? 'lg:pb-4 lg:pt-4 lg:sm:pb-6 lg:sm:pt-6 h-full overflow-y-auto' : 'pb-4 sm:pb-6 pt-4 sm:pt-6'}`}>
          {/* 왼쪽 사이드바 - 사용자 프로필 */}
          {/* 모바일: activeTab이 null일 때만 표시, 데스크톱: 항상 표시 */}
          <div className={`w-full lg:w-80 flex-shrink-0 ${activeTab !== null ? 'hidden lg:block' : 'flex flex-col h-full'}`}>
            {/* 프로필 카드 */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-4 sm:p-6 mb-4 lg:mb-0">
              {/* 사용자 프로필 섹션 */}
              <div className="text-center mb-4 sm:mb-6">
                <ProfileImage 
                  src={currentUser?.profileImageUrl}
                  alt={currentUser?.nickname}
                  size={80}
                  className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4"
                />
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">{currentUser?.nickname || '사용자'}</h2>
                <p className="text-gray-500 text-xs sm:text-sm mb-2">{currentUser?.bio || '소개가 없습니다.'}</p>
                
                {/* 평점 표시 */}
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="flex gap-1">
                    {renderStarRating(currentUser?.rating || 0)}
                  </div>
                  <span className="text-sm font-medium text-gray-600">{currentUser?.rating || 0}</span>
        </div>

                {/* 사용자 정보 */}
                <div className="bg-gray-50 rounded-xl mb-4 p-3 sm:p-4">
                  <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                    <div className="text-center">
                      <div className="text-gray-600 mb-1">이름</div>
                      <div className="font-medium text-gray-900">{currentUser?.name || '-'}</div>
              </div>
                    <div className="text-center">
                      <div className="text-gray-600 mb-1">인증 상태</div>
                      <div className="font-medium text-gray-900">{currentUser?.verified ? '✓ 인증됨' : '미인증'}</div>
              </div>
            </div>
                  {currentUser?.email && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="text-center">
                        <div className="text-gray-600 mb-1">이메일</div>
                        <div className="font-medium text-gray-900 text-xs">{currentUser.email}</div>
              </div>
            </div>
                  )}
          </div>
          
                {/* 통계 */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4 sm:mb-6">
                  <button
                    onClick={() => {
                      setActiveTab('products');
                      setProductTab('registered');
                    }}
                    className="text-center p-2 sm:p-3 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
                  >
                    <div className="text-lg sm:text-xl font-bold text-gray-900">{userProducts.length}</div>
                    <div className="text-xs text-gray-600">등록 상품</div>
                  </button>
                  <div className="text-center p-2 sm:p-3 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                    <div className="text-lg sm:text-xl font-bold text-gray-900">{currentUser?.reviewCount || 0}</div>
                    <div className="text-xs text-gray-600">리뷰</div>
              </div>
            </div>
          </div>
          
              {/* 네비게이션 링크 */}
              <div className="space-y-2">
                <button
                  onClick={() => setActiveTab('products')}
                  className={`w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-xl transition-all duration-200 ${
                    activeTab === 'products'
                      ? 'bg-gradient-to-r from-gray-800 to-gray-900 text-white shadow-lg'
                      : 'text-gray-600 hover:bg-gray-100/50'
                  }`}
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <span className="text-sm sm:text-base font-medium">상품 관리</span>
                </button>
                
                <button
                  onClick={() => setActiveTab('account')}
                  className={`w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-xl transition-all duration-200 ${
                    activeTab === 'account'
                      ? 'bg-gradient-to-r from-gray-800 to-gray-900 text-white shadow-lg'
                      : 'text-gray-600 hover:bg-gray-100/50'
                  }`}
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-sm sm:text-base font-medium">계정 관리</span>
                </button>
            </div>
            
            {/* 모바일: 활동 통계와 등록 상품 위젯 (activeTab이 null일 때만 표시) */}
            {activeTab === null && (
              <div className="lg:hidden space-y-4 flex-1 flex flex-col min-h-0">
                {/* 활동 통계 위젯 */}
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-4 flex-shrink-0">
                  <h4 className="font-semibold text-gray-900 mb-3 text-sm">활동 통계</h4>
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        setActiveTab('products');
                        setProductTab('registered');
                      }}
                      className="w-full flex items-center justify-between p-2.5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-center gap-2">
                        <FiPackage className="w-4 h-4 text-gray-700" />
                        <span className="text-xs font-medium text-gray-700">등록 상품</span>
                      </div>
                      <span className="text-base font-bold text-gray-900">{userProducts.length}</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        setActiveTab('products');
                        setProductTab('liked');
                      }}
                      className="w-full flex items-center justify-between p-2.5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-center gap-2">
                        <FiHeart className="w-4 h-4 text-gray-700" />
                        <span className="text-xs font-medium text-gray-700">찜한 상품</span>
                      </div>
                      <span className="text-base font-bold text-gray-900">{likedProducts.length}</span>
                    </button>
                    
                    <button
                      onClick={() => navigate('/chats')}
                      className="w-full flex items-center justify-between p-2.5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-center gap-2">
                        <FiMessageCircle className="w-4 h-4 text-gray-700" />
                        <span className="text-xs font-medium text-gray-700">채팅방</span>
                      </div>
                      <span className="text-base font-bold text-gray-900">{chatRoomsCount}</span>
                    </button>
                  </div>
                </div>
                
                {/* 등록 상품 목록 위젯 */}
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-4 flex-1 flex flex-col min-h-0">
                  <h4 className="font-semibold text-gray-900 mb-3 text-sm flex-shrink-0">등록 상품</h4>
                  <div className="space-y-2 flex-1 overflow-y-auto scrollbar-hide min-h-0">
                    {userProducts.length > 0 ? (
                      userProducts.map((product, index) => {
                        const productId = product.id || product.productId;
                        return (
                          <button
                            key={productId}
                            onClick={() => productId && navigate(`/products/${productId}`)}
                            className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-all duration-200 flex-shrink-0"
                          >
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              index === 0 ? 'bg-gray-400' :
                              index === 1 ? 'bg-gray-500' :
                              index === 2 ? 'bg-gray-600' :
                              'bg-gray-300'
                            }`}></div>
                            <span className="text-xs font-medium truncate">{product.title}</span>
                          </button>
                        );
                      })
                    ) : (
                      <div className="text-center py-4 text-gray-500 text-xs">
                        등록된 상품이 없습니다
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

          {/* 중앙 메인 콘텐츠 영역 */}
          {/* 모바일: activeTab이 null이면 숨김, 데스크톱: 항상 표시 */}
          <div className={`flex-1 ${!activeTab ? 'hidden lg:flex' : 'w-full'}`}>
            {/* 상품 관리 섹션 */}
            {activeTab === 'products' && (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-4 sm:p-6 min-h-[calc(100vh-200px)] lg:h-[calc(100vh-100px)] flex flex-col w-full">
                {/* 모바일: 뒤로가기 버튼 */}
                <div className="lg:hidden flex items-center mb-4 flex-shrink-0">
                  <button
                    onClick={() => setActiveTab(null)}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="text-sm font-medium">뒤로</span>
                  </button>
                </div>
                <div className="flex items-center justify-between mb-4 sm:mb-6 flex-shrink-0">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 lg:block">{activeTab === 'products' ? '상품 관리' : ''}</h3>
                  <div className="flex bg-gray-100 rounded-xl p-1 overflow-x-auto scrollbar-hide">
                    <button
                      onClick={() => setProductTab('registered')}
                      className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                        productTab === 'registered'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      등록 상품
                    </button>
                    <button
                      onClick={() => setProductTab('liked')}
                      className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                        productTab === 'liked'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      찜한 상품
                    </button>
                    <button
                      onClick={() => setProductTab('borrowed')}
                      className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                        productTab === 'borrowed'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      빌린 내역
                    </button>
              <button
                      onClick={() => setProductTab('lent')}
                      className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                        productTab === 'lent'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                      빌려준 내역
              </button>
          </div>
        </div>

                <div className="flex-1 overflow-y-auto scrollbar-hide">
                  <div className="pr-2">
                    {productTab === 'registered' && <RegisteredProductList />}
                    {productTab === 'liked' && <LikedProductList />}
                    {productTab === 'borrowed' && <BorrowedHistoryList />}
                    {productTab === 'lent' && <LentHistoryList />}
                  </div>
        </div>
      </div>
            )}

            {/* 계정 관리 섹션 */}
            {activeTab === 'account' && (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-4 sm:p-6 min-h-[calc(100vh-200px)] lg:h-[calc(100vh-100px)] flex flex-col w-full">
                {/* 모바일: 뒤로가기 버튼 */}
                <div className="lg:hidden flex items-center mb-4 flex-shrink-0">
                  <button
                    onClick={() => setActiveTab(null)}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="text-sm font-medium">뒤로</span>
                  </button>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4 flex-shrink-0">계정 관리</h3>
                <div className="flex-1 overflow-y-auto scrollbar-hide space-y-3 pr-2">
          <button
                    onClick={() => navigate('/mypage/profile')}
                    className="w-full bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all duration-200"
          >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-100">
                        <FiUser className="w-5 h-5 text-gray-700" />
                      </div>
                      <div className="flex-1 text-left">
                        <h3 className="font-semibold text-base text-gray-900">회원 정보</h3>
                        <p className="text-xs mt-0.5 text-gray-500">회원 정보 조회</p>
              </div>
                      <FiChevronRight className="w-4 h-4 text-gray-400" />
              </div>
                  </button>

                  <button
                    onClick={() => navigate('/mypage/edit')}
                    className="w-full bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all duration-200"
                  >
              <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-100">
                        <FiEdit className="w-5 h-5 text-gray-700" />
                      </div>
                      <div className="flex-1 text-left">
                        <h3 className="font-semibold text-base text-gray-900">정보 수정</h3>
                        <p className="text-xs mt-0.5 text-gray-500">회원 정보 수정</p>
              </div>
                      <FiChevronRight className="w-4 h-4 text-gray-400" />
            </div>
          </button>

                  <button
                    onClick={() => navigate('/mypage/image')}
                    className="w-full bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-100">
                        <FiCamera className="w-5 h-5 text-gray-700" />
                      </div>
                      <div className="flex-1 text-left">
                        <h3 className="font-semibold text-base text-gray-900">프로필 이미지</h3>
                        <p className="text-xs mt-0.5 text-gray-500">프로필 이미지 관리</p>
      </div>
                      <FiChevronRight className="w-4 h-4 text-gray-400" />
          </div>
                  </button>
          
              <button
                    onClick={() => navigate('/mypage/verify')}
                    className="w-full bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-100">
                        <FiShield className="w-5 h-5 text-gray-700" />
          </div>
                      <div className="flex-1 text-left">
                        <h3 className="font-semibold text-base text-gray-900">계좌 인증</h3>
                        <p className="text-xs mt-0.5 text-gray-500">계좌 인증</p>
        </div>
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-md border border-gray-300">
                        인증 필요
                      </span>
                      <FiChevronRight className="w-4 h-4 text-gray-400" />
      </div>
                  </button>

                  <button
                    onClick={() => navigate('/mypage/delete')}
                    className="w-full bg-red-50 border border-red-200 rounded-xl p-4 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-100">
                        <FiTrash2 className="w-5 h-5 text-red-600" />
                      </div>
                      <div className="flex-1 text-left">
                        <h3 className="font-semibold text-base text-red-900">회원 탈퇴</h3>
                        <p className="text-xs mt-0.5 text-red-600">회원 탈퇴</p>
              </div>
                      <FiChevronRight className="w-4 h-4 text-red-400" />
            </div>
                  </button>
          </div>
        </div>
            )}
      </div>

          {/* 오른쪽 위젯 영역 - 모바일에서 숨김 */}
          <div className="hidden lg:block lg:w-80 flex-shrink-0">
            <div className="space-y-6">
              {/* 활동 통계 위젯 */}
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-4 sm:p-6">
                <h4 className="font-semibold text-gray-900 mb-4">활동 통계</h4>
                <div className="space-y-3">
                <button
                    onClick={() => {
                      setActiveTab('products');
                      setProductTab('registered');
                    }}
                    className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
                  >
                    <div className="flex items-center gap-3">
                      <FiPackage className="w-5 h-5 text-gray-700" />
                      <span className="text-sm font-medium text-gray-700">등록 상품</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">{userProducts.length}</span>
                </button>
                  
                  <button
                    onClick={() => {
                      setActiveTab('products');
                      setProductTab('liked');
                    }}
                    className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
                  >
                    <div className="flex items-center gap-3">
                      <FiHeart className="w-5 h-5 text-gray-700" />
                      <span className="text-sm font-medium text-gray-700">찜한 상품</span>
        </div>
                    <span className="text-lg font-bold text-gray-900">{likedProducts.length}</span>
                  </button>
                  
                <button
                    onClick={() => navigate('/chats')}
                    className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
                  >
                    <div className="flex items-center gap-3">
                      <FiMessageCircle className="w-5 h-5 text-gray-700" />
                      <span className="text-sm font-medium text-gray-700">채팅방</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">{chatRoomsCount}</span>
                </button>
              </div>
            </div>
            
              {/* 등록 상품 목록 위젯 */}
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-4 sm:p-6 h-[calc(100vh-450px)] flex flex-col">
                <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-4 flex-shrink-0">등록 상품</h4>
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                  <div className="space-y-3 pr-2">
                    {userProducts.length > 0 ? (
                      userProducts.slice(0, 5).map((product, index) => {
                        const productId = product.id || product.productId;
                        return (
                          <button
                            key={productId}
                            onClick={() => productId && navigate(`/products/${productId}`)}
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 text-gray-600 transition-all duration-200"
                          >
                            <div className={`w-3 h-3 rounded-full ${
                              index === 0 ? 'bg-gray-400' :
                              index === 1 ? 'bg-gray-500' :
                              index === 2 ? 'bg-gray-600' :
                              'bg-gray-300'
                            }`}></div>
                            <span className="text-sm font-medium truncate">{product.title}</span>
                          </button>
                        );
                      })
                    ) : (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="text-center py-4 text-gray-500 text-sm">
                          등록된 상품이 없습니다
          </div>
        </div>
      )}
    </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MyPageMain;