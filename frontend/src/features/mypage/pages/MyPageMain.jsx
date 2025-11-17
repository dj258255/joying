/**
 * MyPageMain Component
 * 현대적인 대시보드 스타일 (멤버 페이지 디자인)
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useMyProducts } from '@/features/product/hooks/useMyProducts';
import { useLikedProducts } from '@/features/product/hooks/useLikedProducts';
import { useChatRooms } from '@/features/chat/hooks/useChatRooms';
import { useReviews } from '@/features/review/hooks/useReviews';
import { ROUTE_PATHS } from '@/shared/constants/routePaths';
import { 
  FiPackage, 
  FiHeart, 
  FiMessageCircle, 
  FiUser, 
  FiCamera, 
  FiTrash2,
  FiChevronRight,
  FiShield,
  FiEdit,
  FiArrowLeft
} from 'react-icons/fi';

// 컴포넌트
import ProfileImage from '../../../shared/components/ProfileImage';
import BorrowedHistoryList from '../components/BorrowedHistoryList';
import LentHistoryList from '../components/LentHistoryList';
import RegisteredProductList from '../components/RegisteredProductList';
import LikedProductList from '../components/LikedProductList';
import AccountVerifyForm from '../components/AccountVerifyForm';
import ReviewCard from '@/features/review/components/ReviewCard';
import { axiosInstance } from '@/lib/axios/axiosInstance';

// 공통 네비게이션
import SideNavbar from '../../../shared/components/Navbar/SideNavbar';

const MyPageMain = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser } = useAuth();
  const scrollContainerRef = React.useRef(null);
  
  // 데스크톱에서는 'products' 기본 선택, 모바일에서는 null
  const [activeTab, setActiveTab] = useState(() => {
    // location.state에서 전달된 activeTab이 있으면 사용
    if (location.state?.activeTab) {
      return location.state.activeTab;
    }
    // 초기 렌더링 시 화면 크기에 따라 결정
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024 ? 'products' : null;
    }
    return null;
  });
  const [productTab, setProductTab] = useState(() => {
    // location.state에서 전달된 productTab이 있으면 사용
    return location.state?.productTab || 'registered';
  });
  const [reviewTab, setReviewTab] = useState('received'); // received: 받은 리뷰, written: 작성한 리뷰
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [receivedReviews, setReceivedReviews] = useState([]);
  const [writtenReviews, setWrittenReviews] = useState([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);

  // currentUserId를 먼저 선언
  const currentUserId = currentUser?.memberId || currentUser?.id;

  // location.state가 변경되면 탭 업데이트
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
    if (location.state?.productTab) {
      setProductTab(location.state.productTab);
    }
  }, [location.state]);

  // productTab 변경 시 스크롤을 맨 위로 이동 (빌린 내역/빌려준 내역 탭 변경 시)
  useEffect(() => {
    // 약간의 delay를 주어 DOM이 업데이트된 후 스크롤 이동
    const timer = setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
      // window 스크롤도 맨 위로 이동
      window.scrollTo({ top: 0, behavior: 'instant' });
    }, 0);

    return () => clearTimeout(timer);
  }, [productTab]);

  // 리뷰 데이터 로드 함수
  const loadReviews = async () => {
    if (!currentUserId) return;

    setIsLoadingReviews(true);
    try {
      // 받은 리뷰 (RENT: 빌려줬을 때 받은 리뷰)
      const receivedResponse = await axiosInstance.get(`/review/member/${currentUserId}`, {
        params: {
          uploadType: 'RENT',
          page: 1,
          size: 100
        }
      });

      // 작성한 리뷰 (BORROW: 빌렸을 때 작성한 리뷰)
      const writtenResponse = await axiosInstance.get(`/review/member/${currentUserId}`, {
        params: {
          uploadType: 'BORROW',
          page: 1,
          size: 100
        }
      });

      setReceivedReviews(receivedResponse.data.data.content || []);
      setWrittenReviews(writtenResponse.data.data.content || []);
    } catch (error) {
      console.error('리뷰 로드 실패:', error);
      setReceivedReviews([]);
      setWrittenReviews([]);
    } finally {
      setIsLoadingReviews(false);
    }
  };

  // 리뷰 탭이 활성화되면 리뷰 데이터 로드
  useEffect(() => {
    if (activeTab === 'reviews' && currentUserId) {
      loadReviews();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, currentUserId]);
  
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

  // 채팅방 수 조회
  const { chatRooms } = useChatRooms();
  const chatRoomsCount = chatRooms?.length || 0;

  // 리뷰 개수 조회 (사용자 ID가 있을 때만)
  const { reviews: userReviews } = useReviews('member', currentUserId, {
    enabled: !!currentUserId
  });
  const reviewCount = userReviews?.length || 0;

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
      <div className={`bg-gradient-to-br from-gray-50 to-gray-100 ${activeTab === null ? 'lg:min-h-screen h-screen overflow-hidden' : 'min-h-screen h-screen overflow-hidden'}`}>
        {/* 뒤로가기 버튼 (데스크톱만) */}
        <div className="hidden lg:block px-4 sm:px-6 pt-2 sm:pt-3">
          <button
            onClick={() => navigate(ROUTE_PATHS.PRODUCTS)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-gray-600 hover:text-gray-900 hover:bg-white/50 rounded-lg transition-all duration-200 group"
          >
            <FiArrowLeft className="w-4 h-4 group-hover:transform group-hover:-translate-x-1 transition-transform duration-200" />
            <span className="text-sm font-medium">뒤로가기</span>
          </button>
        </div>
        
        <div className={`flex flex-col lg:flex-row gap-4 lg:gap-6 px-4 sm:px-6 ${activeTab === null ? 'pt-4 lg:pt-2 lg:pb-2 h-full overflow-y-auto' : 'pt-4 lg:pt-2 pb-2 sm:pb-3'}`}>
          {/* 왼쪽 사이드바 - 사용자 프로필 */}
          {/* 모바일: activeTab이 null일 때만 표시, 데스크톱: 항상 표시 */}
          <div className={`w-full lg:w-80 flex-shrink-0 ${activeTab !== null ? 'hidden lg:block' : 'flex flex-col h-full'}`}>
            {/* 프로필 카드 */}
            <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-4 sm:p-6 mb-4 lg:mb-0">
              {/* 홈 버튼 (모바일만) */}
              <button
                onClick={() => navigate(ROUTE_PATHS.PRODUCTS)}
                className="lg:hidden absolute top-3 right-3 p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-200"
                title="상품 목록으로 이동"
              >
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </button>
              
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
                    <div className="text-lg sm:text-xl font-bold text-gray-900">{reviewCount}</div>
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
                  onClick={() => setActiveTab('reviews')}
                  className={`w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-xl transition-all duration-200 ${
                    activeTab === 'reviews'
                      ? 'bg-gradient-to-r from-gray-800 to-gray-900 text-white shadow-lg'
                      : 'text-gray-600 hover:bg-gray-100/50'
                  }`}
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  <span className="text-sm sm:text-base font-medium">내 리뷰</span>
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
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-4 flex-shrink-0">
                  <h4 className="font-semibold text-gray-900 mb-3 text-sm">등록 상품</h4>
                  <div className="space-y-2 max-h-[80px] overflow-y-auto scrollbar-hide">
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
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-3 pb-0 sm:px-6 sm:pt-6 sm:pb-0 h-[calc(100vh-80px)] lg:h-[calc(100vh-60px)] flex flex-col w-full">
                {/* 모바일: 뒤로가기 버튼 */}
                <div className="lg:hidden flex items-center mb-2 flex-shrink-0">
                  <button
                    onClick={() => setActiveTab(null)}
                    className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="text-xs font-medium">뒤로</span>
                  </button>
                </div>
                <div className="flex items-center justify-between mb-3 sm:mb-6 flex-shrink-0">
                  <h3 className="text-base sm:text-xl font-bold text-gray-900 lg:block">{activeTab === 'products' ? '상품 관리' : ''}</h3>
                  <div className="flex bg-gray-100 rounded-lg p-0.5 sm:p-1 overflow-x-auto scrollbar-hide">
                    <button
                      onClick={() => setProductTab('registered')}
                      className={`px-2 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-sm font-medium rounded-md sm:rounded-lg transition-colors whitespace-nowrap ${
                        productTab === 'registered'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      등록 상품
                    </button>
                    <button
                      onClick={() => setProductTab('liked')}
                      className={`px-2 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-sm font-medium rounded-md sm:rounded-lg transition-colors whitespace-nowrap ${
                        productTab === 'liked'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      찜한 상품
                    </button>
                    <button
                      onClick={() => setProductTab('borrowed')}
                      className={`px-2 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-sm font-medium rounded-md sm:rounded-lg transition-colors whitespace-nowrap ${
                        productTab === 'borrowed'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      빌린 내역
                    </button>
              <button
                      onClick={() => setProductTab('lent')}
                      className={`px-2 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-sm font-medium rounded-md sm:rounded-lg transition-colors whitespace-nowrap ${
                        productTab === 'lent'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                      빌려준 내역
              </button>
          </div>
        </div>

                <div ref={scrollContainerRef} className="flex-1 overflow-y-auto scrollbar-hide pb-0">
                  <div className="pb-0">
                    {productTab === 'registered' && <RegisteredProductList />}
                    {productTab === 'liked' && <LikedProductList />}
                    {productTab === 'borrowed' && <BorrowedHistoryList />}
                    {productTab === 'lent' && <LentHistoryList />}
                  </div>
        </div>
      </div>
            )}

            {/* 계좌 인증 섹션 */}
            {activeTab === 'account-verify' && (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-3 sm:p-6 min-h-[calc(100vh-100px)] lg:h-[calc(100vh-80px)] flex flex-col w-full">
                {/* 모바일: 뒤로가기 버튼 */}
                <div className="lg:hidden flex items-center mb-2 flex-shrink-0">
                  <button
                    onClick={() => setActiveTab('account')}
                    className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="text-xs font-medium">뒤로</span>
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                  <AccountVerifyForm 
                    onComplete={() => {
                      // 인증 완료 후 계정 관리 탭으로 돌아가기
                      setActiveTab('account');
                    }}
                  />
                </div>
              </div>
            )}

            {/* 리뷰 관리 섹션 */}
            {activeTab === 'reviews' && (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-3 pb-0 sm:px-6 sm:pt-6 sm:pb-0 h-[calc(100vh-80px)] lg:h-[calc(100vh-60px)] flex flex-col w-full">
                {/* 모바일: 뒤로가기 버튼 */}
                <div className="lg:hidden flex items-center mb-2 flex-shrink-0">
                  <button
                    onClick={() => setActiveTab(null)}
                    className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="text-xs font-medium">뒤로</span>
                  </button>
                </div>

                <div className="flex items-center justify-between mb-3 sm:mb-6 flex-shrink-0">
                  <h3 className="text-base sm:text-xl font-bold text-gray-900">내 리뷰</h3>
                  <div className="flex bg-gray-100 rounded-lg p-0.5 sm:p-1">
                    <button
                      onClick={() => setReviewTab('received')}
                      className={`px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-sm font-medium rounded-md sm:rounded-lg transition-colors whitespace-nowrap ${
                        reviewTab === 'received'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      빌려줬을 때
                    </button>
                    <button
                      onClick={() => setReviewTab('written')}
                      className={`px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-sm font-medium rounded-md sm:rounded-lg transition-colors whitespace-nowrap ${
                        reviewTab === 'written'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      빌렸을 때
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-hide pb-4">
                  {isLoadingReviews ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="text-gray-500">로딩 중...</div>
                    </div>
                  ) : (
                    <div className="space-y-3 sm:space-y-4">
                      {reviewTab === 'received' && (
                        <>
                          {receivedReviews.length > 0 ? (
                            receivedReviews.map((review, index) => (
                              <ReviewCard
                                key={index}
                                review={review}
                                showProductInfo={true}
                                showRating={true}
                              />
                            ))
                          ) : (
                            <div className="flex flex-col items-center justify-center h-64 text-center">
                              <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                              <p className="text-gray-500 text-sm">아직 받은 리뷰가 없습니다</p>
                              <p className="text-gray-400 text-xs mt-2">상품을 빌려주면 리뷰를 받을 수 있습니다</p>
                            </div>
                          )}
                        </>
                      )}

                      {reviewTab === 'written' && (
                        <>
                          {writtenReviews.length > 0 ? (
                            writtenReviews.map((review, index) => (
                              <ReviewCard
                                key={index}
                                review={review}
                                showProductInfo={true}
                                showRating={true}
                              />
                            ))
                          ) : (
                            <div className="flex flex-col items-center justify-center h-64 text-center">
                              <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                              <p className="text-gray-500 text-sm">아직 작성한 리뷰가 없습니다</p>
                              <p className="text-gray-400 text-xs mt-2">상품을 빌린 후 리뷰를 작성해보세요</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 계정 관리 섹션 */}
            {activeTab === 'account' && (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-3 sm:p-6 min-h-[calc(100vh-100px)] lg:h-[calc(100vh-80px)] flex flex-col w-full">
                {/* 모바일: 뒤로가기 버튼 */}
                <div className="lg:hidden flex items-center mb-2 flex-shrink-0">
                  <button
                    onClick={() => setActiveTab(null)}
                    className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="text-xs font-medium">뒤로</span>
                  </button>
                </div>
                <h3 className="text-base sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex-shrink-0">계정 관리</h3>
                <div className="flex-1 overflow-y-auto scrollbar-hide space-y-3 pr-2">
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
                    onClick={() => setActiveTab('account-verify')}
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
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-md border ${
                        currentUser?.verified 
                          ? 'bg-green-100 text-green-700 border-green-300' 
                          : 'bg-gray-100 text-gray-700 border-gray-300'
                      }`}>
                        {currentUser?.verified ? '인증 완료' : '인증 필요'}
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