/**
 * ProductDetailPage Component
 * 상품 상세 페이지 컴포넌트 - 좌측 캘린더 영역과 우측 컨텐츠 영역이 따로 스크롤
 */

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ImageGallery from '../components/ImageGallery';
import ProductInfo from '../components/ProductInfo';
import SellerProfile from '../../../features/seller/components/SellerProfile';
import ReviewList from '../../../features/review/components/ReviewList';
import DateRangeCalendar from '../../../features/checkout/components/DateRangeCalendar';
import PriceCalculation from '../../../features/checkout/components/PriceCalculation';
import RentButton from '../../../features/checkout/components/RentButton';
import { chatApi } from '../../../features/chat/api/chatApi';
import { messageApi } from '../../../features/chat/api/messageApi';
import { DUMMY_PRODUCTS, DUMMY_USERS, DUMMY_REVIEWS } from '../../../shared/constants/dummyData';
import SideNavbar from '../../../shared/components/Navbar/SideNavbar';

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // 날짜 범위 상태
  const [dateRange, setDateRange] = useState(null);
  // 모바일 캘린더 표시 상태
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  // 터치 이벤트 상태
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  
  // 더미 데이터에서 상품 찾기
  const product = DUMMY_PRODUCTS.find(p => p.id === id) || DUMMY_PRODUCTS[0];
  
  // 해당 상품의 리뷰 필터링
  const productReviews = DUMMY_REVIEWS.filter(review => review.productId === product.id);

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
      // 대여 요청 정보 구성
      const rentalInfo = {
        productTitle: product.title,
        productImage: product.images?.[0],
        startDate: dateRange.start,
        endDate: dateRange.end,
        days: calculateDays(),
        dailyPrice: product.price,
        deposit: product.deposit,
        totalPrice: (product.price * calculateDays()) + product.deposit,
        requesterName: DUMMY_USERS.currentUser.nickname,
        requesterProfile: DUMMY_USERS.currentUser.profileImage
      };

      // 채팅방 생성
      const chatRoomId = await chatApi.createChatRoom(product.sellerId);
      
      // 대여 요청 메시지 전송
      await messageApi.sendRentalRequest(chatRoomId, {
        productId: product.id,
        startDate: dateRange.start,
        endDate: dateRange.end,
        rentalInfo: rentalInfo
      });

      // 채팅방으로 이동
      navigate(`/chats/${chatRoomId}`, { 
        state: { 
          rentalInfo: rentalInfo
        } 
      });
    } catch (error) {
      console.error('대여 요청 실패:', error);
      alert('대여 요청에 실패했습니다. 다시 시도해주세요.');
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
      <SideNavbar />
      <style>
        {`
          .glass-card {
            background: rgba(255, 255, 255, 0.8);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 20px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.4);
            transition: all 0.3s ease;
          }
          
          .glass-card:hover {
            background: rgba(255, 255, 255, 0.9);
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.5);
            transform: translateY(-2px);
          }
          
          .glass-section {
            background: rgba(255, 255, 255, 0.8);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 20px;
            padding: 24px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.4);
            margin-bottom: 24px;
            transition: all 0.3s ease;
          }
          
          .glass-section:hover {
            background: rgba(255, 255, 255, 0.9);
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.5);
            transform: translateY(-2px);
          }
          
          .glass-rent-button {
            background: rgba(0, 122, 204, 0.2);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(0, 122, 204, 0.3);
            box-shadow: 0 8px 32px rgba(0, 122, 204, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.3);
            transition: all 0.3s ease;
          }
          
          .glass-rent-button:hover {
            background: rgba(0, 122, 204, 0.3);
            box-shadow: 0 12px 40px rgba(0, 122, 204, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4);
            transform: translateY(-2px);
          }
          
          .glass-rent-button:disabled {
            background: rgba(156, 163, 175, 0.2);
            border: 1px solid rgba(156, 163, 175, 0.3);
            box-shadow: 0 4px 16px rgba(156, 163, 175, 0.1);
            cursor: not-allowed;
          }
          
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>
      
      <div className="flex h-screen bg-gray-50">
        {/* 좌측 캘린더 영역 - 고정 스크롤 */}
        <div className="hidden lg:block w-1/3 h-screen overflow-y-auto sticky top-0 bg-white border-r border-gray-200 p-4 scrollbar-hide">
          <div className="space-y-4">
            {/* 뒤로가기 버튼 */}
            <div className="mb-6">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl glass-card hover:bg-white/20 transition-all duration-200 w-full"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-gray-600 font-medium">뒤로 가기</span>
              </button>
            </div>

            {/* 가격 표시 */}
            <div className="glass-card p-4">
              <div className="text-2xl font-extrabold text-blue-600 mb-2">
                {product.price.toLocaleString()}원
                <span className="text-base text-gray-600 font-medium">/일</span>
              </div>
              <div className="text-sm text-gray-600">
                📍 {product.location}
              </div>
            </div>

            {/* 날짜 선택 */}
            <div className="glass-card">
              <DateRangeCalendar
                onDateRangeChange={handleDateRangeChange}
                disabledDates={[]}
              />
            </div>

            {/* 가격 계산 */}
            <div className="glass-card">
              <PriceCalculation
                pricePerDay={product.price}
                deposit={product.deposit}
                days={calculateDays()}
              />
            </div>

            {/* 대여 버튼 */}
            <div className="glass-card">
              <RentButton
                isEnabled={!!dateRange && !!dateRange.start && !!dateRange.end}
                onClick={handleRentRequest}
              />
            </div>
          </div>
        </div>

        {/* 우측 컨텐츠 영역 - 스크롤 가능 */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {/* 모바일 헤더 */}
          <div className="lg:hidden p-4 bg-white border-b border-gray-200">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl glass-card hover:bg-white/20 transition-all duration-200"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-gray-600 font-medium">뒤로가기</span>
              </button>
            </div>
          </div>

          {/* 모바일 캘린더 오버레이 */}
          {isCalendarOpen && (
            <div className="lg:hidden fixed inset-0 z-50 bg-black/50 flex items-end">
              <div className="w-full bg-white rounded-t-3xl p-4 space-y-4 animate-in slide-in-from-bottom-2 duration-300 max-h-[80vh] overflow-y-auto">
                {/* 가격 표시 */}
                <div className="glass-card p-4">
                  <div className="text-xl font-extrabold text-blue-600 mb-2">
                    {product.price.toLocaleString()}원
                    <span className="text-sm text-gray-600 font-medium">/일</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    📍 {product.location}
                  </div>
                </div>

                {/* 날짜 선택 */}
                <div className="glass-card">
                  <DateRangeCalendar
                    onDateRangeChange={handleDateRangeChange}
                    disabledDates={[]}
                  />
                </div>

                {/* 가격 계산 - 날짜 선택 시에만 표시 */}
                {dateRange && dateRange.start && dateRange.end && (
                  <div className="glass-card">
                    <PriceCalculation
                      pricePerDay={product.price}
                      deposit={product.deposit}
                      days={calculateDays()}
                    />
                  </div>
                )}

                {/* 빌려주세요 버튼 */}
                <RentButton
                  isEnabled={!!dateRange && !!dateRange.start && !!dateRange.end}
                  onClick={handleRentRequest}
                />

                {/* 닫기 버튼 */}
                <button
                  onClick={() => setIsCalendarOpen(false)}
                  className="w-full py-3 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
          )}

          {/* 상품 컨텐츠 */}
          <div className="p-4 lg:p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* 이미지 갤러리 */}
              <div className="glass-section">
                <ImageGallery 
                  images={product.images}
                  productTitle={product.title}
                  isLiked={false}
                  onLikeClick={() => console.log('찜하기')}
                />
              </div>

              {/* 상품 정보 */}
              <div className="glass-section">
                <ProductInfo
                  title={product.title}
                  hashtags={product.hashtags}
                  description={product.description}
                />
              </div>

              {/* 판매자 정보 */}
              <div className="glass-section">
                <SellerProfile seller={product.seller} sellerId={product.sellerId} />
              </div>

              {/* 리뷰 목록 */}
              <div className="glass-section">
                <ReviewList reviews={productReviews} />
              </div>
            </div>
          </div>

          {/* 모바일 하단 고정 푸터 */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 space-y-3 shadow-2xl" style={{
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(20px)',
            borderTop: '1px solid rgba(255, 255, 255, 0.3)'
          }}>
            {/* 캘린더 토글 버튼 */}
            <button
              onClick={() => setIsCalendarOpen(!isCalendarOpen)}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="w-full flex items-center justify-center p-2 rounded-xl glass-card hover:bg-white/10 transition-all duration-200"
            >
                <svg 
                  className={`w-6 h-6 text-gray-600 transition-transform duration-200 ${isCalendarOpen ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
            </button>

            {/* 총 금액 - 날짜 선택 시에만 표시 */}
            {dateRange && dateRange.start && dateRange.end && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">총 금액</span>
                <span className="text-xl font-extrabold text-blue-600">
                  {((product.price * calculateDays()) + product.deposit).toLocaleString()}원
                </span>
              </div>
            )}

            <RentButton
              isEnabled={!!dateRange && !!dateRange.start && !!dateRange.end}
              onClick={handleRentRequest}
            />
          </div>

          {/* 하단 여백 (모바일 푸터 공간 확보) */}
          <div className="lg:hidden h-32" />
        </div>
      </div>
    </>
  );
};

export default ProductDetailPage;