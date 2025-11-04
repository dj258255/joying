/**
 * ProductDetailPage Component
 * 상품 상세 페이지 - 참고 프로젝트의 깔끔한 디자인 적용
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
      
      <div className="min-h-screen bg-gray-50">
        {/* 데스크톱 레이아웃 */}
        <div className="hidden lg:block">
          <div className="max-w-[1400px] mx-auto px-6 py-8">
            {/* 뒤로가기 버튼 */}
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 mb-6 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm font-medium">뒤로 가기</span>
            </button>

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

              {/* 우측: 제품 정보 */}
              <div className="space-y-6">
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
        </div>

        {/* 모바일 레이아웃 */}
        <div className="lg:hidden">
          {/* 모바일 헤더 */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm font-medium">뒤로가기</span>
            </button>
          </div>

          {/* 모바일 컨텐츠 */}
          <div className="pb-32">
            {/* 이미지 갤러리 */}
            <div className="bg-white p-4">
              <ImageGallery 
                images={product.images}
                productTitle={product.title}
                isLiked={false}
                onLikeClick={() => console.log('찜하기')}
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
                    disabledDates={[]}
                  />
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
                    빌려주세요
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