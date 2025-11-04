/**
 * ProductDetailPage Component
 * 상품 상세 페이지 컴포넌트 - 좌측 캘린더 영역과 우측 컨텐츠 영역이 따로 스크롤
 */

import React, { useMemo, useState } from 'react';
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

const ProductDetailPage = () => {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  
  // productId를 문자열/숫자로 변환 (객체가 아닌 값만 사용)
  const productId = useMemo(() => {
    if (!routeId) return null;
    // 문자열이나 숫자면 그대로 사용, 객체면 null 반환
    if (typeof routeId === 'string' || typeof routeId === 'number') {
      return String(routeId);
    }
    return null;
  }, [routeId]);
  
  // 날짜 범위 상태
  const [dateRange, setDateRange] = useState(null);
  // 모바일 캘린더 표시 상태
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  // 터치 이벤트 상태
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  
  // 실제 상품 상세 조회
  const { product: productResponse, isLoading, error } = useProductDetail(productId);
  
  // 판매자 정보 조회 (writer.name이 null인 경우 nickname 가져오기)
  const sellerMemberId = productResponse?.writer?.memberId || productResponse?.writer?.member_id;
  const { user: sellerUser } = useUserProfile(sellerMemberId);

  // 상세 응답을 페이지에서 사용하던 형태로 정규화
  const product = useMemo(() => {
    if (!productResponse) return null;
    
    // API 응답 구조: camelCase (productId, rentalFee, memberId 등)
    const images = Array.isArray(productResponse.files)
      ? productResponse.files.map(f => f.url)
      : [];

    // rentalRefuses를 disabledDates 형식으로 변환 (날짜 문자열 배열)
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
        // writer.name이 null이면 판매자 정보의 nickname 사용
        nickname: productResponse?.writer?.name || sellerUser?.nickname || '판매자',
        name: productResponse?.writer?.name || sellerUser?.nickname || '판매자',
        profileImage: productResponse?.writer?.profileImageUrl || productResponse?.writer?.profile_image_url || sellerUser?.profileImageUrl,
        profile_image_url: productResponse?.writer?.profileImageUrl || productResponse?.writer?.profile_image_url || sellerUser?.profileImageUrl,
        rating: Number(productResponse?.writer?.rating) || 0,
        reviewCount: Number(productResponse.totalReviewCount || productResponse.total_review_count) || 0,
      },
      hashtags: productResponse?.hashtags || [],
      reviews: reviews,
      isLiked: productResponse?.liked || false,
      disabledDates: disabledDates,
      startRent: productResponse?.startRent || productResponse?.start_rent,
      endRent: productResponse?.endRent || productResponse?.end_rent,
      category: productResponse?.category,
      uploadType: productResponse?.uploadType || productResponse?.upload_type,
      rentMethod: productResponse?.rentMethod || productResponse?.rent_method,
      videoNecessary: productResponse?.videoNecessary || productResponse?.video_necessary,
      rating: Number(productResponse?.rating) || 0,
      totalReviewCount: Number(productResponse?.totalReviewCount || productResponse?.total_review_count) || 0,
    };
  }, [productResponse, sellerUser]);
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
        dailyPrice: product.price || 0,
        deposit: product.deposit || 0,
        totalPrice: ((product.price || 0) * calculateDays()) + (product.deposit || 0),
        requesterName: DUMMY_USERS.currentUser.username,
        requesterProfile: DUMMY_USERS.currentUser.profileImageUrl
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
                {(product.price || 0).toLocaleString()}원
                <span className="text-base text-gray-600 font-medium">/일</span>
              </div>
              <div className="text-sm text-gray-600">
                📍 {product.location || '위치 정보 없음'}
              </div>
            </div>

            {/* 날짜 선택 */}
            <div className="glass-card">
              <DateRangeCalendar
                onDateRangeChange={handleDateRangeChange}
                disabledDates={product.disabledDates || []}
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
                    {(product.price || 0).toLocaleString()}원
                    <span className="text-sm text-gray-600 font-medium">/일</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    📍 {product.location || '위치 정보 없음'}
                  </div>
                </div>

                {/* 날짜 선택 */}
                <div className="glass-card">
                  <DateRangeCalendar
                    onDateRangeChange={handleDateRangeChange}
                    disabledDates={product.disabledDates || []}
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
                  isLiked={product.isLiked}
                  onLikeClick={() => {
                    // TODO: 찜하기 API 연동
                    console.log('찜하기', product.id);
                  }}
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
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  리뷰 {product.totalReviewCount > 0 && `(${product.totalReviewCount})`}
                </h3>
                <div className="space-y-4">
                  {(product.reviews || []).map((review, index) => (
                    <ReviewCard
                      key={review.review_id || index}
                      review={review}
                      showProductInfo={false}
                      showRating={true}
                    />
                  ))}
                  {(product.reviews || []).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      등록된 리뷰가 없습니다.
                    </div>
                  )}
                </div>
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
                  {(((product.price || 0) * calculateDays()) + (product.deposit || 0)).toLocaleString()}원
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