/**
 * ProductDetailPage Component
 * 상품 상세 페이지 - 참고 프로젝트의 깔끔한 디자인 적용
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ImageGallery from '../components/ImageGallery';
import ProductInfo from '../components/ProductInfo';
import SellerProfile from '../../../features/seller/components/SellerProfile';
import ReviewCard from '../../../features/review/components/ReviewCard';
import DateRangeCalendar from '../../../features/checkout/components/DateRangeCalendar';
import PriceCalculation from '../../../features/checkout/components/PriceCalculation';
import RentButton from '../../../features/checkout/components/RentButton';
import { chatApi } from '../../../features/chat/api/chatApi';
import { messageApi } from '../../../features/chat/api/messageApi';
import { DUMMY_USERS } from '../../../shared/constants/dummyData';
import SideNavbar from '../../../shared/components/Navbar/SideNavbar';
import { useProductDetail } from '@/features/product/hooks/useProductDetail';
import { useUserProfile } from '@/features/user/hooks/useUserProfile';
import { useAuth } from '../../../features/auth/contexts/AuthContext';
import { ROUTE_PATHS } from '../../../shared/constants';
import { useProductLike } from '../hooks/useProductLike';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/react-query/queryKeys';

const ProductDetailPage = () => {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  
  // productId를 문자열/숫자로 변환
  const productId = useMemo(() => {
    if (!routeId) return null;
    if (typeof routeId === 'string' || typeof routeId === 'number') {
      return String(routeId);
    }
    return null;
  }, [routeId]);
  
  // 날짜 범위 상태
  const [dateRange, setDateRange] = useState(null);
  // 대여 방식 상태
  const [rentMethod, setRentMethod] = useState('BOTH');
  // 모바일 캘린더 표시 상태
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  // 사이드바 상태
  const [isSideNavOpen, setIsSideNavOpen] = useState(false);
  // 터치 이벤트 상태
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  // 찜하기 상태 (로컬 상태로 즉시 UI 반영)
  // 서버 응답에 liked 필드가 있으면 그 값을 사용, 없으면 undefined (임의로 false 설정하지 않음)
  const [isLiked, setIsLiked] = useState(undefined);

  // 모바일 캘린더 모달이 열릴 때 body 스크롤 막기
  useEffect(() => {
    if (isCalendarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // 컴포넌트 언마운트 시 정리
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isCalendarOpen]);
  
  // 실제 상품 상세 조회
  const { product: productResponse, isLoading, error } = useProductDetail(productId);
  
  // 판매자 정보 조회
  const sellerMemberId = productResponse?.writer?.memberId || productResponse?.writer?.member_id;
  const { user: sellerUser } = useUserProfile(sellerMemberId);

  // 찜하기 기능
  const { toggleLike, isLoading: isLikeLoading } = useProductLike(productId);
  
  // productResponse가 변경되면 isLiked 상태 동기화
  useEffect(() => {
    if (productResponse) {
      // 서버 응답에 liked 필드가 있으면 그 값을 사용, 없으면 undefined
      const newLiked = productResponse?.liked !== undefined ? productResponse.liked : undefined;
      console.log('[ProductDetailPage] productResponse 변경 감지:', { 
        productId, 
        oldLiked: isLiked, 
        newLiked,
        hasLikedField: 'liked' in (productResponse || {})
      });
      // undefined일 경우 false로 표시 (UI용)
      setIsLiked(newLiked ?? false);
    }
  }, [productResponse?.liked, productId]);
  
  const handleLikeClick = () => {
    if (isLikeLoading || !productResponse || !productId) {
      console.warn('[ProductDetailPage] 찜하기 불가:', { isLikeLoading, productResponse: !!productResponse, productId });
      return;
    }
    // 현재 상태 저장
    const currentLiked = isLiked;
    const previousLiked = isLiked;
    const newLikedState = !currentLiked;
    console.log('[ProductDetailPage] 찜하기 클릭:', { productId, currentLiked, newLikedState });
    // 즉시 UI 업데이트 (optimistic update)
    setIsLiked(newLikedState);
    // 상품 상세 캐시도 즉시 업데이트
    queryClient.setQueryData([QUERY_KEYS.PRODUCT_DETAIL, productId], (oldData) => {
      if (oldData) {
        return {
          ...oldData,
          liked: newLikedState
        };
      }
      return oldData;
    });
    // API 호출 (이전 상태 전달)
    toggleLike(currentLiked).catch((error) => {
      // 에러 발생 시 이전 상태로 롤백
      console.error('[ProductDetailPage] 찜하기 실패, 상태 롤백:', error);
      setIsLiked(previousLiked);
      queryClient.setQueryData([QUERY_KEYS.PRODUCT_DETAIL, productId], (oldData) => {
        if (oldData) {
          return {
            ...oldData,
            liked: previousLiked
          };
        }
        return oldData;
      });
    });
  };

  // API 응답을 페이지 형태로 정규화
  const product = useMemo(() => {
    if (!productResponse) return null;
    
    // 이미지 배열 변환
    const images = Array.isArray(productResponse.files)
      ? productResponse.files.map(f => f.url)
      : [];

    // rentalRefuses를 disabledDates 형식으로 변환
    const disabledDates = Array.isArray(productResponse.rentalRefuses)
      ? productResponse.rentalRefuses.flatMap(refuse => {
          const start = new Date(refuse.startRef);
          const end = new Date(refuse.endRef);
          const dates = [];
          const currentDate = new Date(start);
          while (currentDate <= end) {
            dates.push(currentDate.toISOString().split('T')[0]);
            currentDate.setDate(currentDate.getDate() + 1);
          }
          return dates;
        })
      : [];

    // 리뷰 데이터 매핑
    const reviews = Array.isArray(productResponse.reviews)
      ? productResponse.reviews.map(review => ({
          id: review.review_id,
          review_id: review.review_id,
          title: review.title,
          content: review.content,
          rating: review.rating,
          createdAt: review.created_at || review.createdAt,
          reviewer: {
            member_id: review.reviewer?.member_id,
            username: review.reviewer?.name,
            name: review.reviewer?.name,
            profileImageUrl: review.reviewer?.profile_image_url,
            profile_image_url: review.reviewer?.profile_image_url,
          },
        }))
      : [];

    return {
      id: productResponse.productId || productResponse.product_id,
      title: productResponse.title || '',
      description: productResponse.content || '',
      price: Number(productResponse.rentalFee || productResponse.rental_fee) || 0,
      deposit: Number(productResponse.deposit) || 0,
      location: [
        productResponse?.region?.sido,
        productResponse?.region?.gungu,
        productResponse?.region?.dong
      ].filter(Boolean).join(' ') || '',
      images,
      sellerId: productResponse?.writer?.memberId || productResponse?.writer?.member_id,
      seller: {
        nickname: productResponse?.writer?.name || sellerUser?.nickname || '판매자',
        name: productResponse?.writer?.name || sellerUser?.nickname || '판매자',
        profileImage: productResponse?.writer?.profileImageUrl || productResponse?.writer?.profile_image_url || sellerUser?.profileImageUrl,
        profile_image_url: productResponse?.writer?.profileImageUrl || productResponse?.writer?.profile_image_url || sellerUser?.profileImageUrl,
        rating: Number(productResponse?.writer?.rating) || 0,
        reviewCount: Number(productResponse.totalReviewCount || productResponse.total_review_count) || 0,
      },
      hashtags: productResponse?.hashtags || [],
      reviews: reviews,
      isLiked: productResponse?.liked !== undefined ? productResponse.liked : false,
      disabledDates: disabledDates,
      category: productResponse?.category?.name || productResponse?.category || '',
      rating: Number(productResponse?.rating) || 0,
      totalReviewCount: Number(productResponse?.totalReviewCount || productResponse?.total_review_count) || 0,
    };
  }, [productResponse, sellerUser]);

  // 로딩 상태
  if (isLoading) {
    return (
      <>
        <SideNavbar />
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <div className="text-gray-600">상품 정보를 불러오는 중...</div>
        </div>
      </>
    );
  }

  // 에러 또는 데이터 없음
  if (error || !product) {
    return (
      <>
        <SideNavbar />
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <div className="text-red-500">상품 정보를 불러올 수 없습니다.</div>
        </div>
      </>
    );
  }
  
  // 해당 상품의 리뷰 (이미 product에 포함되어 있음)
  const productReviews = product.reviews || [];

  const handleDateRangeChange = (range) => {
    setDateRange(range);
  };

  // 터치 이벤트 핸들러
  const handleTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientY);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isUpSwipe = distance > 50;
    
    if (isUpSwipe && !isCalendarOpen) {
      setIsCalendarOpen(true);
    }
  };

  const handleRentRequest = async () => {
    try {
      if (!dateRange || !dateRange.start || !dateRange.end) {
        alert('대여 기간을 선택해주세요.');
        return;
      }

      // 현재 사용자 정보 확인
      console.log('🔍 사용자 정보 확인:', { isAuthenticated, user });

      if (!isAuthenticated || !user) {
        alert('로그인이 필요합니다.');
        navigate(ROUTE_PATHS.LOGIN);
        return;
      }

      // 채팅방 생성 또는 기존 채팅방 조회 (백엔드 API 호출)
      console.log('[ProductDetailPage] 대여 요청 - 채팅방 생성 요청:', { productId: product.id });
      const chatRoomData = await chatApi.createChatRoom(product.id);

      console.log('[ProductDetailPage] 채팅방 생성 완료:', chatRoomData);

      // 채팅방 ID 추출 (백엔드 응답: ChatRoomResponse.chatRoomId)
      const chatRoomId = chatRoomData.chatRoomId;

      if (!chatRoomId) {
        throw new Error('채팅방 ID를 받을 수 없습니다.');
      }

      // 채팅방으로 이동하면서 대여 요청 정보 전달
      navigate(`/chats/${chatRoomId}`, {
        state: {
          productId: product.id,
          chatRoomData: chatRoomData, // 생성 응답 데이터 전달
          autoSendRentalRequest: true, // 자동 대여 요청 플래그
          rentalRequestData: {
            startDate: dateRange.start.toISOString(),
            endDate: dateRange.end.toISOString(),
            rentMethod: rentMethod,
            productTitle: product.title
          }
        }
      });
    } catch (error) {
      console.error('대여 요청 실패:', error);
      alert(`대여 요청에 실패했습니다: ${error.message || '알 수 없는 오류가 발생했습니다.'}`);
    }
  };

  const calculateDays = () => {
    if (!dateRange || !dateRange.start || !dateRange.end) return 0;
    const diffTime = Math.abs(dateRange.end - dateRange.start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  return (
    <>
      <SideNavbar isOpen={isSideNavOpen} onClose={() => setIsSideNavOpen(false)} />
      
      <div className="min-h-screen bg-gray-50">
        {/* 데스크톱 레이아웃 */}
        <div className="hidden lg:block h-screen overflow-hidden">
          <div className="max-w-[1400px] mx-auto px-6 py-8 h-full flex flex-col">
            {/* 헤더: 뒤로가기 버튼 + 프로필 */}
            <div className="flex items-center justify-between mb-6 flex-shrink-0">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm font-medium">뒤로 가기</span>
              </button>

              {/* 프로필 버튼 */}
              {isAuthenticated && (
                <button
                  onClick={() => setIsSideNavOpen(!isSideNavOpen)}
                  className="group relative w-9 h-9 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-white font-bold text-sm shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 ring-2 ring-white/30 hover:ring-white/50"
                  title={user?.nickname || '프로필'}
                >
                  {user?.nickname?.charAt(0) || '👤'}
                </button>
              )}
            </div>

            <div className="grid lg:grid-cols-10 gap-8 flex-1 overflow-hidden relative">
              {/* 좌측: 이미지 갤러리만 (4칸) */}
              <div className="lg:col-span-4 h-full overflow-y-auto scrollbar-hide pb-8 pr-4">
                {/* 이미지 갤러리 */}
                <ImageGallery 
                  images={product.images}
                  productTitle={product.title}
                  isLiked={isLiked}
                  onLikeClick={handleLikeClick}
                />
              </div>

              {/* 가운데 구분선 */}
              <div className="absolute top-0 bottom-0 w-px bg-gray-200 pointer-events-none" style={{ left: 'calc(40%)' }}></div>

              {/* 우측: 제품 정보 + 대여 기간 선택 + 상품 설명 + 판매자 정보 + 리뷰 (6칸, 스크롤) */}
              <div className="lg:col-span-6 h-full overflow-y-auto scrollbar-hide space-y-6 pb-8 pl-4">
                {/* 기본 정보 */}
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-3">
                    {product.title}
                  </h1>
                  <div className="text-3xl font-bold text-gray-900 mb-4">
                    {product.price.toLocaleString()}원<span className="text-lg text-gray-600 font-normal">/일</span>
                  </div>
                  
                  {/* 별점과 위치 */}
                  <div className="flex items-center gap-4 text-sm mb-6">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          className={`w-5 h-5 ${
                            i < Math.floor(product.rating || 0)
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300 fill-current'
                          }`}
                          viewBox="0 0 20 20"
                        >
                          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                        </svg>
                      ))}
                    </div>
                    <span className="text-gray-600">{productReviews.length} reviews</span>
                    <span className="text-gray-400">•</span>
                    <span className="flex items-center gap-1 text-gray-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {product.location}
                    </span>
                  </div>

                  <div className="text-sm text-gray-600 mb-6">
                    보증금: {product.deposit.toLocaleString()}원
                  </div>
                </div>

                {/* 대여 기간 선택 */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-base font-semibold text-gray-900 mb-4">대여 기간 선택</h3>
                  
                  <div className="flex gap-6">
                    {/* 왼쪽: 캘린더 */}
                    <div className="flex-shrink-0">
                      <DateRangeCalendar
                        onDateRangeChange={handleDateRangeChange}
                        disabledDates={product.disabledDates || []}
                      />
                      
                      {/* 대여 방식 선택 */}
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          대여 방식
                        </label>
                        <div className="space-y-2">
                          <label className="flex items-center p-2 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                            <input
                              type="radio"
                              name="rentMethod"
                              value="ONLY_ONLINE"
                              checked={rentMethod === 'ONLY_ONLINE'}
                              onChange={(e) => setRentMethod(e.target.value)}
                              className="mr-2"
                            />
                            <span className="text-sm">택배거래</span>
                          </label>
                          <label className="flex items-center p-2 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                            <input
                              type="radio"
                              name="rentMethod"
                              value="ONLY_OFFLINE"
                              checked={rentMethod === 'ONLY_OFFLINE'}
                              onChange={(e) => setRentMethod(e.target.value)}
                              className="mr-2"
                            />
                            <span className="text-sm">직거래</span>
                          </label>
                          <label className="flex items-center p-2 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                            <input
                              type="radio"
                              name="rentMethod"
                              value="BOTH"
                              checked={rentMethod === 'BOTH'}
                              onChange={(e) => setRentMethod(e.target.value)}
                              className="mr-2"
                            />
                            <span className="text-sm">둘 다 가능</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* 오른쪽: 가격 정보 및 버튼 */}
                    <div className="flex-1 flex flex-col justify-between min-h-[320px]">
                      {/* 가격 요약 */}
                      {dateRange && dateRange.start && dateRange.end ? (
                        <div className="space-y-4">
                          <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">대여료 ({calculateDays()}일)</span>
                              <span className="font-semibold text-gray-900">{(product.price * calculateDays()).toLocaleString()}원</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">보증금</span>
                              <span className="font-semibold text-gray-900">{product.deposit.toLocaleString()}원</span>
                            </div>
                          </div>
                          <div className="pt-4 border-t border-gray-300">
                            <div className="flex justify-between items-center">
                              <span className="text-base font-semibold text-gray-900">총 결제 금액</span>
                              <span className="text-2xl font-bold text-gray-900">
                                {((product.price * calculateDays()) + product.deposit).toLocaleString()}원
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-32 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-500">날짜를 선택해주세요</p>
                        </div>
                      )}

                      {/* 버튼 그룹 */}
                      <div className="flex gap-3 mt-auto">
                        <button
                          disabled={!dateRange || !dateRange.start || !dateRange.end}
                          onClick={handleRentRequest}
                          className="flex-1 bg-gray-900 text-white py-4 rounded-lg font-semibold hover:bg-black transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          대여 요청하기
                        </button>
                        <button
                          onClick={handleLikeClick}
                          className={`w-14 h-14 border-2 rounded-lg transition-colors flex items-center justify-center flex-shrink-0 ${
                            isLiked 
                              ? 'border-red-500 hover:border-red-600' 
                              : 'border-gray-300 hover:border-gray-900'
                          }`}
                        >
                          <svg
                            className={`w-6 h-6 ${isLiked ? 'text-red-500' : 'text-gray-600'}`}
                            fill={isLiked ? 'currentColor' : 'none'}
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 상품 설명 */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-base font-semibold text-gray-900 mb-3">상품 설명</h3>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                    {product.description}
                  </p>
                  {product.hashtags && product.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {product.hashtags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 판매자 정보 */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-base font-semibold text-gray-900 mb-4">판매자 정보</h3>
                  <SellerProfile seller={product.seller} sellerId={product.sellerId} />
                </div>

                {/* 리뷰 섹션 */}
                <div className="border-t border-gray-200 pt-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">
                    리뷰 ({productReviews.length})
                  </h2>

                  {/* 리뷰 목록 */}
                  <div className="space-y-4">
                    {productReviews.map((review, index) => (
                      <ReviewCard
                        key={review.id || index}
                        review={review}
                        showProductInfo={false}
                        showRating={true}
                      />
                    ))}
                    {productReviews.length === 0 && (
                      <div className="text-center py-12 text-gray-500">
                        <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                        <p className="text-sm">아직 등록된 리뷰가 없습니다</p>
                        <p className="text-xs mt-1 text-gray-400">첫 리뷰를 남겨보세요!</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 모바일 레이아웃 */}
        <div className="lg:hidden">
          {/* 모바일 헤더 */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm font-medium">뒤로가기</span>
              </button>

              {/* 프로필/로그인 버튼 */}
              {isAuthenticated ? (
                <button
                  onClick={() => setIsSideNavOpen(!isSideNavOpen)}
                  className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-white font-bold text-sm shadow-md transition-all duration-300 ring-2 ring-white/30"
                  title={user?.nickname || '프로필'}
                >
                  {user?.nickname?.charAt(0) || '👤'}
                </button>
              ) : (
                <button
                  onClick={() => navigate(ROUTE_PATHS.LOGIN)}
                  className="px-3 py-2 rounded-md text-xs font-medium text-white bg-gray-900 hover:bg-black transition-colors shadow-sm"
                  title="로그인하기"
                >
                  로그인
                </button>
              )}
            </div>
          </div>

          {/* 모바일 컨텐츠 */}
          <div className="pb-32">
            {/* 이미지 갤러리 */}
            <div className="bg-white p-4">
              <ImageGallery 
                images={product.images}
                productTitle={product.title}
                isLiked={isLiked}
                onLikeClick={handleLikeClick}
              />
            </div>

            {/* 상품 정보 */}
            <div className="bg-white p-6 mt-2">
              <div className="text-sm text-gray-500 mb-1">{product.category}</div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">{product.title}</h1>
              
              {/* 별점 */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className={`w-4 h-4 ${
                        i < Math.floor(product.rating || 0)
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                      viewBox="0 0 20 20"
                    >
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                </div>
                <span className="text-sm text-gray-600">{productReviews.length} reviews</span>
              </div>

              {/* 가격 */}
              <div className="mb-4 pb-4 border-b border-gray-200">
                <div className="text-2xl font-bold text-gray-900">
                  {product.price.toLocaleString()}원
                  <span className="text-base text-gray-600 font-normal ml-2">/일</span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  보증금: {product.deposit.toLocaleString()}원
                </div>
                <div className="text-sm text-gray-600 flex items-center gap-1 mt-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {product.location}
                </div>
              </div>

              {/* 상품 설명 */}
              <div className="mb-4">
                <h3 className="text-base font-semibold text-gray-900 mb-2">상품 설명</h3>
                <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                  {product.description}
                </div>
                
                {/* 해시태그 */}
                {product.hashtags && product.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {product.hashtags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 판매자 정보 */}
            <div className="bg-white p-6 mt-2">
              <h3 className="text-base font-semibold text-gray-900 mb-4">판매자 정보</h3>
              <SellerProfile seller={product.seller} sellerId={product.sellerId} />
            </div>

            {/* 리뷰 */}
            <div className="bg-white p-6 mt-2">
              <h3 className="text-base font-semibold text-gray-900 mb-4">
                리뷰 ({productReviews.length})
              </h3>
              <div className="space-y-4">
                {productReviews.map((review, index) => (
                  <ReviewCard
                    key={review.id || index}
                    review={review}
                    showProductInfo={false}
                    showRating={true}
                  />
                ))}
                {productReviews.length === 0 && (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    등록된 리뷰가 없습니다.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 모바일 하단 고정 바 */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-20">
            <button
              onClick={() => setIsCalendarOpen(true)}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="w-full bg-gray-900 text-white py-4 rounded-lg font-semibold hover:bg-black transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              날짜 선택하고 대여하기
            </button>
          </div>

          {/* 모바일 캘린더 모달 */}
          {isCalendarOpen && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end">
              <div className="w-full bg-white rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">대여 기간 선택</h2>
                  <button
                    onClick={() => setIsCalendarOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* 가격 정보 */}
                <div className="bg-gray-50 p-4 rounded-xl mb-6">
                  <div className="text-lg font-bold text-gray-900">
                    {product.price.toLocaleString()}원
                    <span className="text-sm text-gray-600 font-normal ml-2">/일</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    보증금: {product.deposit.toLocaleString()}원
                  </div>
                </div>

                {/* 캘린더 */}
                <div className="mb-6">
                  <DateRangeCalendar
                    onDateRangeChange={handleDateRangeChange}
                    disabledDates={product.disabledDates || []}
                  />
                </div>

                {/* 대여 방식 선택 (모바일) */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    대여 방식
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <input
                        type="radio"
                        name="rentMethod-mobile"
                        value="ONLY_ONLINE"
                        checked={rentMethod === 'ONLY_ONLINE'}
                        onChange={(e) => setRentMethod(e.target.value)}
                        className="mr-3"
                      />
                      <div>
                        <div className="font-medium text-gray-900">택배거래</div>
                        <div className="text-xs text-gray-500">택배로 배송받습니다</div>
                      </div>
                    </label>
                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <input
                        type="radio"
                        name="rentMethod-mobile"
                        value="ONLY_OFFLINE"
                        checked={rentMethod === 'ONLY_OFFLINE'}
                        onChange={(e) => setRentMethod(e.target.value)}
                        className="mr-3"
                      />
                      <div>
                        <div className="font-medium text-gray-900">직거래</div>
                        <div className="text-xs text-gray-500">직접 만나서 받습니다</div>
                      </div>
                    </label>
                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <input
                        type="radio"
                        name="rentMethod-mobile"
                        value="BOTH"
                        checked={rentMethod === 'BOTH'}
                        onChange={(e) => setRentMethod(e.target.value)}
                        className="mr-3"
                      />
                      <div>
                        <div className="font-medium text-gray-900">둘 다 가능</div>
                        <div className="text-xs text-gray-500">택배거래 또는 직거래 가능</div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* 가격 계산 */}
                {dateRange && dateRange.start && dateRange.end && (
                  <div className="mb-6">
                    <PriceCalculation
                      pricePerDay={product.price}
                      deposit={product.deposit}
                      days={calculateDays()}
                    />
                  </div>
                )}

                {/* 대여 버튼 */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsCalendarOpen(false)}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    disabled={!dateRange || !dateRange.start || !dateRange.end}
                    onClick={handleRentRequest}
                    className="flex-1 bg-gray-900 text-white py-3 rounded-lg font-semibold hover:bg-black transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    대여 요청하기
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ProductDetailPage;
