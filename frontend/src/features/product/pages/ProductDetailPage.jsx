/**
 * ProductDetailPage Component
 * 상품 상세 페이지 - 참고 프로젝트의 깔끔한 디자인 적용
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import ImageGallery from '../components/ImageGallery';
import ProductInfo from '../components/ProductInfo';
import SellerProfile from '../../../features/seller/components/SellerProfile';
import ReviewCard from '../../../features/review/components/ReviewCard';
import DateRangeCalendar from '../../../features/checkout/components/DateRangeCalendar';
import PriceCalculation from '../../../features/checkout/components/PriceCalculation';
import RentButton from '../../../features/checkout/components/RentButton';
import { chatApi } from '../../../features/chat/api/chatApi';
import { messageApi } from '../../../features/chat/api/messageApi';
import SideNavbar from '../../../shared/components/Navbar/SideNavbar';
import ProfileImage from '../../../shared/components/ProfileImage';
import { useProductDetail } from '@/features/product/hooks/useProductDetail';
import { useUserProfile } from '@/features/user/hooks/useUserProfile';
import { useAuth } from '../../../features/auth/contexts/AuthContext';
import { ROUTE_PATHS } from '../../../shared/constants';
import { useProductLike } from '../hooks/useProductLike';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/react-query/queryKeys';
import { axiosInstance } from '@/lib/axios/axiosInstance';
import { productReviewApi } from '@/features/review/api/productReviewApi';

const ProductDetailPage = () => {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
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

  // 판매자의 총 리뷰 개수 상태
  const [sellerReviewCount, setSellerReviewCount] = useState(0);
  
  // 리뷰 이미지 데이터 상태
  const [reviewsWithImages, setReviewsWithImages] = useState([]);

  // 판매자의 총 리뷰 개수 조회
  useEffect(() => {
    if (!sellerMemberId) return;

    const fetchSellerReviewCount = async () => {
      try {
        const [borrowRes, rentRes] = await Promise.all([
          axiosInstance.get(`/review/member/${sellerMemberId}`, {
            params: { uploadType: 'BORROW', page: 1, size: 1 }
          }),
          axiosInstance.get(`/review/member/${sellerMemberId}`, {
            params: { uploadType: 'RENT', page: 1, size: 1 }
          })
        ]);

        const borrowCount = borrowRes.data.data.totalCount || 0;
        const rentCount = rentRes.data.data.totalCount || 0;
        setSellerReviewCount(borrowCount + rentCount);
      } catch (error) {
        console.error('판매자 리뷰 개수 조회 실패:', error);
        setSellerReviewCount(0);
      }
    };

    fetchSellerReviewCount();
  }, [sellerMemberId]);

  // 리뷰 이미지 조회
  useEffect(() => {
    const fetchReviewImages = async () => {
      if (!productId || !productResponse) return;

      try {
        // 상품 리뷰 API로 리뷰 이미지 포함 데이터 가져오기
        const reviewResponse = await productReviewApi.getProductReviews(productId, {
          page: 1,
          size: 100 // 충분히 큰 값으로 모든 리뷰 가져오기
        });

        // 응답 구조 확인
        const reviewData = reviewResponse?.data?.data || reviewResponse?.data || reviewResponse?.body?.data || [];
        const reviews = Array.isArray(reviewData) ? reviewData : (reviewData?.data || []);

        // reviewId를 키로 하는 맵 생성
        const reviewImageMap = {};
        reviews.forEach(review => {
          if (review.reviewId) {
            reviewImageMap[review.reviewId] = {
              imageUrls: review.imageUrls || review.image_urls || review.images || [],
              fileIds: review.fileIds || review.file_ids || []
            };
          }
        });

        setReviewsWithImages(reviewImageMap);
      } catch (error) {
        console.error('리뷰 이미지 조회 실패:', error);
        setReviewsWithImages({});
      }
    };

    fetchReviewImages();
  }, [productId, productResponse]);

  // 찜하기 기능
  const { toggleLike, isLoading: isLikeLoading } = useProductLike(productId);
  
  // productResponse가 변경되면 isLiked 상태 동기화
  useEffect(() => {
    if (productResponse) {
      // 서버 응답에 liked 필드가 있으면 그 값을 사용, 없으면 undefined (liked, isLiked, isLike 모두 체크)
      const newLiked = productResponse?.liked !== undefined 
        ? productResponse.liked 
        : (productResponse?.isLiked !== undefined 
          ? productResponse.isLiked 
          : (productResponse?.isLike !== undefined ? productResponse.isLike : undefined));
      console.log('[ProductDetailPage] productResponse 변경 감지:', { 
        productId, 
        oldLiked: isLiked, 
        newLiked,
        hasLikedField: 'liked' in (productResponse || {}),
        hasIsLikedField: 'isLiked' in (productResponse || {}),
        hasIsLikeField: 'isLike' in (productResponse || {})
      });
      // undefined일 경우 false로 표시 (UI용)
      setIsLiked(newLiked ?? false);
    }
  }, [productResponse?.liked, productResponse?.isLiked, productResponse?.isLike, productId]);
  
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
          // ISO 문자열을 YYYY-MM-DD 형식으로 직접 추출 (타임존 문제 방지)
          const startDateStr = refuse.startRef.split('T')[0];
          const endDateStr = refuse.endRef.split('T')[0];
          
          const start = new Date(startDateStr + 'T00:00:00');
          const end = new Date(endDateStr + 'T00:00:00');
          const dates = [];
          const currentDate = new Date(start);
          
          while (currentDate <= end) {
            const year = currentDate.getFullYear();
            const month = String(currentDate.getMonth() + 1).padStart(2, '0');
            const day = String(currentDate.getDate()).padStart(2, '0');
            dates.push(`${year}-${month}-${day}`);
            currentDate.setDate(currentDate.getDate() + 1);
          }
          return dates;
        })
      : [];

    // 리뷰 데이터 매핑 (이미지 정보 병합)
    const reviews = Array.isArray(productResponse.reviews)
      ? productResponse.reviews.map(review => {
          const reviewId = review.review_id || review.reviewId;
          const imageData = reviewsWithImages[reviewId] || {};
          
          return {
            id: reviewId,
            reviewId: reviewId,
            title: review.title,
            content: review.content,
            rating: review.rating,
            createdAt: review.created_at || review.createdAt,
            imageUrls: imageData.imageUrls || review.imageUrls || review.image_urls || review.images || [],
            reviewer: {
              memberId: review.reviewer?.memberId,
              nickname: review.reviewer?.nickname,
              profileImageUrl: review.reviewer?.profileImageUrl || review.reviewer?.profile_image_url,
            },
          };
        })
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
        nickname: productResponse?.writer?.nickname || sellerUser?.nickname || '판매자',
        name: productResponse?.writer?.nickname || sellerUser?.nickname || '판매자',
        profileImage: productResponse?.writer?.profileImageUrl || productResponse?.writer?.profile_image_url || sellerUser?.profileImageUrl,
        profile_image_url: productResponse?.writer?.profileImageUrl || productResponse?.writer?.profile_image_url || sellerUser?.profileImageUrl,
        rating: Number(productResponse?.writer?.rating) || 0,
        reviewCount: sellerReviewCount,
      },
      hashtags: productResponse?.hashtags || [],
      reviews: reviews,
      isLiked: productResponse?.liked !== undefined 
        ? productResponse.liked 
        : (productResponse?.isLiked !== undefined 
          ? productResponse.isLiked 
          : (productResponse?.isLike !== undefined ? productResponse.isLike : false)),
      disabledDates: disabledDates,
      category: productResponse?.category?.name || productResponse?.category || '',
      rating: Number(productResponse?.rating) || 0,
      totalReviewCount: Number(productResponse?.totalReviewCount || productResponse?.total_review_count) || 0,
      // 추가 정보
      rentMethod: productResponse?.rentMethod || 'BOTH',
      startRent: productResponse?.startRent || null,
      endRent: productResponse?.endRent || null,
      uploadType: productResponse?.uploadType || 'RENT',
    };
  }, [productResponse, sellerUser, sellerReviewCount, reviewsWithImages]);

  // 본인 상품 여부 확인 (모든 Hook은 조건부 return 전에 호출되어야 함)
  const isOwnProduct = useMemo(() => {
    if (!user || !product) return false;
    return user.memberId === product.sellerId || user.member_id === product.sellerId;
  }, [user, product]);

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
  if (error || (!isLoading && !product)) {
    return (
      <>
        <SideNavbar />
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <div className="text-center">
            <div className="text-red-500 mb-2">상품 정보를 불러올 수 없습니다.</div>
            {error && <div className="text-sm text-gray-600">{error.message || '알 수 없는 오류가 발생했습니다.'}</div>}
            {!productId && <div className="text-sm text-gray-600">상품 ID가 없습니다.</div>}
          </div>
        </div>
      </>
    );
  }

  // productId가 없으면 로딩 표시
  if (!productId) {
    return (
      <>
        <SideNavbar />
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <div className="text-gray-600">상품 정보를 불러오는 중...</div>
        </div>
      </>
    );
  }
  
  // 해당 상품의 리뷰 (이미 product에 포함되어 있음)
  const productReviews = product.reviews || [];

  const handleDateRangeChange = (range) => {
    setDateRange(range);
  };

  // 뒤로가기 핸들러: 직전 페이지로 이동
  const handleBackClick = () => {
    if (location.state?.fromCreate) {
      // 물품 등록 직후: 마이페이지 등록 물품 탭으로 이동
      navigate(ROUTE_PATHS.MYPAGE, {
        state: { activeTab: 'products', productTab: 'registered' }
      });
    } else if (location.state?.fromMyPage) {
      // 마이페이지에서 온 경우: 마이페이지로 돌아가기
      navigate(ROUTE_PATHS.MYPAGE, {
        state: location.state?.myPageState || {}
      });
    } else {
      // 일반적인 경우: 프로덕트 목록 페이지로 (URL 파라미터 없이 깨끗하게)
      navigate(ROUTE_PATHS.PRODUCTS);
    }
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

      // 본인 상품 대여 요청 방지
      if (user.memberId === product.sellerId || user.member_id === product.sellerId) {
        alert('본인이 등록한 상품은 대여 요청할 수 없습니다.');
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

      // 채팅방으로 이동 (생성된 채팅방 데이터를 state로 전달하여 조회 API 호출 생략)
      // 대여 요청 메시지를 자동으로 전송하기 위해 dateRange와 product 정보도 전달
      // product 객체를 전달할 때 필요한 정보만 추출하여 전달 (직렬화 가능하도록)
      const productDataForRental = {
        id: product.id,
        title: product.title,
        name: product.title, // 호환성을 위해 name도 포함
        imageUrl: product.images && product.images.length > 0 ? product.images[0] : null,
        images: product.images || [],
        mainImageUrl: product.images && product.images.length > 0 ? product.images[0] : null,
        price: product.price,
        dailyPrice: product.price, // 호환성을 위해 dailyPrice도 포함
        deposit: product.deposit || 0
      };
      
      console.log('[ProductDetailPage] 대여 요청 데이터 전달:', {
        chatRoomId,
        dateRange,
        product: productDataForRental,
        rentMethod: 'BOTH'
      });
      
      // 채팅방으로 이동하면서 대여 요청 정보 전달
      navigate(`/chats/${chatRoomId}`, {
        state: {
          productId: product.id,
          chatRoomData: chatRoomData, // 생성 응답 데이터 전달
          // 대여 요청 메시지 자동 전송을 위한 정보
          shouldSendRentalRequest: true,
          autoSendRentalRequest: true, // 자동 대여 요청 플래그
          rentalRequestData: {
            dateRange: dateRange,
            product: productDataForRental,
            rentMethod: 'BOTH', // 기본값 (채팅방 내에서 변경 가능)
            startDate: dateRange.start.toISOString(),
            endDate: dateRange.end.toISOString(),
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

  // 정밀한 별점 렌더링 함수 (마이페이지와 동일한 스타일)
  const renderPreciseStars = (rating) => {
    const calcStarRates = () => {
      let tempStarRatesArr = [0, 0, 0, 0, 0];
      let starScore = rating;

      for (let i = 0; i < 5; i++) {
        if (starScore >= 1) {
          tempStarRatesArr[i] = 14; // 별 하나당 14 (viewBox width)
          starScore -= 1;
        } else {
          tempStarRatesArr[i] = starScore * 14; // 부분 채우기
          break;
        }
      }
      return tempStarRatesArr;
    };

    const ratesResArr = calcStarRates();
    const STAR_IDX_ARR = ['first', 'second', 'third', 'fourth', 'last'];

    return STAR_IDX_ARR.map((item, idx) => {
      const clipId = `clip-product-${idx}-${rating}`;
      const pathId = `path-product-${idx}-${rating}`;

      return (
        <span key={`${item}_${idx}`}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={20}
            height={20}
            viewBox="0 0 14 13"
            fill="#cacaca"
          >
            <clipPath id={clipId}>
              <rect width={ratesResArr[idx]} height={20} />
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

  return (
    <>
      <SideNavbar isOpen={isSideNavOpen} onClose={() => setIsSideNavOpen(false)} />
      
      <div className="min-h-screen bg-gray-50">
        {/* 데스크톱 레이아웃 */}
        <div className="hidden lg:block h-screen overflow-hidden">
          <div className="max-w-[1400px] mx-auto px-6 py-3 h-full flex flex-col">
            {/* 헤더: 뒤로가기 버튼 + 프로필 */}
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <button
                onClick={handleBackClick}
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
                  className="group relative w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 ring-2 ring-white/30 hover:ring-white/50"
                  title={user?.nickname || '프로필'}
                >
                  {user?.profileImageUrl || user?.profile_image_url ? (
                    <ProfileImage
                      src={user.profileImageUrl || user.profile_image_url}
                      alt={user?.nickname || '프로필'}
                      size={36}
                      className="w-full h-full"
                    />
                  ) : (
                    <span className="text-white font-bold text-sm">
                      {user?.nickname?.charAt(0) || '👤'}
                    </span>
                  )}
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
                      {renderPreciseStars(product.rating || 0)}
                    </div>
                    <span className="text-gray-600">{product.rating ? product.rating.toFixed(1) : '0.0'}</span>
                    <span className="text-gray-400">•</span>
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

                  {/* 추가 정보 */}
                  <div className="space-y-3 mb-6">
                    {/* 거래 방식 */}
                    <div className="flex items-center gap-2">
                      {product.rentMethod === 'BOTH' && (
                        <>
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-900 rounded-lg text-sm font-medium">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                            직접 거래
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-900 rounded-lg text-sm font-medium">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                            택배 거래
                          </span>
                        </>
                      )}
                      {product.rentMethod === 'ONLY_OFFLINE' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-900 rounded-lg text-sm font-medium">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                          직접 거래만 가능
                        </span>
                      )}
                      {product.rentMethod === 'ONLY_ONLINE' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-900 rounded-lg text-sm font-medium">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                          택배 거래만 가능
                        </span>
                      )}
                    </div>

                    {/* 대여 가능 기간 */}
                    {(product.startRent || product.endRent) && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      <span>
                        {product.uploadType === 'BORROW' ? '대여 희망 기간' : '대여 가능 기간'}: {' '}
                        {product.startRent && (() => {
                          const dateStr = product.startRent.split('T')[0];
                          const [year, month, day] = dateStr.split('-');
                          return `${year}. ${month}. ${day}.`;
                        })()}
                        {' ~ '}
                        {product.endRent ? (() => {
                          const dateStr = product.endRent.split('T')[0];
                          const [year, month, day] = dateStr.split('-');
                          return `${year}. ${month}. ${day}.`;
                        })() : '제한 없음'}
                      </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 대여 기간 선택 또는 희망 조건 표시 - uploadType에 따라 분기 */}
                {product.uploadType === 'RENT' ? (
                  // 빌려드려요 (RENT): 기존 UI - 캘린더 + 대여 방식 선택 + 가격 계산
                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-base font-semibold text-gray-900 mb-4">대여 기간 선택</h3>

                    <div className="flex gap-6">
                      {/* 왼쪽: 캘린더 */}
                      <div className="flex-shrink-0">
                        <DateRangeCalendar
                          onDateRangeChange={handleDateRangeChange}
                          disabledDates={product.disabledDates || []}
                          availableStartDate={product.startRent}
                          availableEndDate={product.endRent}
                        />

                        {/* 대여 방식 선택 */}
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
                            disabled={isOwnProduct || !dateRange || !dateRange.start || !dateRange.end}
                            onClick={handleRentRequest}
                            className="flex-1 bg-gray-900 text-white py-4 rounded-lg font-semibold hover:bg-black transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                          >
                            {isOwnProduct ? '본인 상품입니다' : '대여 요청하기'}
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
                ) : (
                  // 빌려요 (BORROW): 새로운 UI - 희망 조건만 표시 + 채팅 버튼
                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-base font-semibold text-gray-900 mb-4">희망 조건</h3>

                    <div className="bg-gray-50 rounded-lg p-6 space-y-4 mb-6">
                      {/* 필요한 기간 */}
                      {(product.startRent || product.endRent) && (
                        <div className="flex items-start gap-3">
                          <svg className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-700 mb-1">필요한 기간</div>
                            <div className="text-base text-gray-900">
                              {product.startRent && (() => {
                                const dateStr = product.startRent.split('T')[0];
                                const [year, month, day] = dateStr.split('-');
                                return `${year}년 ${month}월 ${day}일`;
                              })()}
                              {' ~ '}
                              {product.endRent ? (() => {
                                const dateStr = product.endRent.split('T')[0];
                                const [year, month, day] = dateStr.split('-');
                                return `${year}년 ${month}월 ${day}일`;
                              })() : '협의'}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 희망 가격 */}
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-700 mb-1">희망 대여료</div>
                          <div className="text-lg font-semibold text-gray-900">
                            ~ {product.price.toLocaleString()}원<span className="text-base text-gray-600 font-normal">/일</span>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            보증금: ~ {product.deposit.toLocaleString()}원
                          </div>
                        </div>
                      </div>

                      {/* 희망 거래 방식 */}
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-700 mb-1">희망 거래 방식</div>
                          <div className="text-base text-gray-900">
                            {product.rentMethod === 'BOTH' && '택배거래 또는 직거래'}
                            {product.rentMethod === 'ONLY_OFFLINE' && '직거래'}
                            {product.rentMethod === 'ONLY_ONLINE' && '택배거래'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 버튼 */}
                    <div className="flex gap-3">
                      <button
                        disabled={isOwnProduct}
                        onClick={async () => {
                          if (!isAuthenticated || !user) {
                            alert('로그인이 필요합니다.');
                            navigate(ROUTE_PATHS.LOGIN);
                            return;
                          }
                          if (isOwnProduct) {
                            alert('본인이 등록한 글입니다.');
                            return;
                          }
                          try {
                            const chatRoomData = await chatApi.createChatRoom(product.id);

                            // BORROW 상품의 경우 희망 조건 정보를 전달
                            const navigationState = {
                              productId: product.id,
                              chatRoomData,
                              isBorrowRequest: true,
                              borrowInfo: {
                                desiredStartDate: product.startRent,
                                desiredEndDate: product.endRent,
                                desiredRentalFee: product.price,
                                desiredDeposit: product.deposit,
                                rentMethod: product.rentMethod
                              }
                            };

                            navigate(`/chats/${chatRoomData.chatRoomId}`, {
                              state: navigationState
                            });
                          } catch (error) {
                            console.error('채팅방 생성 실패:', error);
                            alert('채팅방 생성에 실패했습니다.');
                          }
                        }}
                        className="flex-1 bg-gray-900 text-white py-4 rounded-lg font-semibold hover:bg-black transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        {isOwnProduct ? '본인 글입니다' : '채팅으로 제안하기'}
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
                )}

                {/* 상품 설명 */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-base font-semibold text-gray-900 mb-3">상품 설명</h3>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                    {product.description}
                  </p>
                  {product.hashtags && product.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {product.hashtags.map((tag, index) => (
                        <button
                          key={index}
                          onClick={() => navigate('/products', {
                            state: {
                              filterByHashtag: { id: tag.id || index, name: tag.name || tag }
                            }
                          })}
                          className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full hover:bg-gray-200 transition-colors cursor-pointer"
                        >
                          #{typeof tag === 'string' ? tag : tag.name}
                        </button>
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
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-2">
            <div className="flex items-center justify-between">
              <button
                onClick={handleBackClick}
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
                  className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center shadow-md transition-all duration-300 ring-2 ring-white/30"
                  title={user?.nickname || '프로필'}
                >
                  {user?.profileImageUrl || user?.profile_image_url ? (
                    <ProfileImage
                      src={user.profileImageUrl || user.profile_image_url}
                      alt={user?.nickname || '프로필'}
                      size={36}
                      className="w-full h-full"
                    />
                  ) : (
                    <span className="text-white font-bold text-sm">
                      {user?.nickname?.charAt(0) || '👤'}
                    </span>
                  )}
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
                <div className="flex items-center gap-1">
                  {renderPreciseStars(product.rating || 0)}
                </div>
                <span className="text-sm text-gray-600">{product.rating ? product.rating.toFixed(1) : '0.0'}</span>
                <span className="text-gray-400">•</span>
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

                {/* 추가 정보 - 모바일 */}
                <div className="space-y-2 mt-4 pt-4 border-t border-gray-200">
                  {/* 거래 방식 */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {product.rentMethod === 'BOTH' && (
                      <>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-900 rounded-lg text-xs font-medium">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                          직접 거래
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-900 rounded-lg text-xs font-medium">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                          택배 거래
                        </span>
                      </>
                    )}
                    {product.rentMethod === 'ONLY_OFFLINE' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-900 rounded-lg text-xs font-medium">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        직접 거래만 가능
                      </span>
                    )}
                    {product.rentMethod === 'ONLY_ONLINE' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-900 rounded-lg text-xs font-medium">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        택배 거래만 가능
                      </span>
                    )}
                  </div>

                  {/* 대여 가능 기간 */}
                  {(product.startRent || product.endRent) && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>
                        {product.uploadType === 'BORROW' ? '대여 희망 기간' : '대여 가능 기간'}: {' '}
                        {product.startRent && (() => {
                          const dateStr = product.startRent.split('T')[0];
                          const [year, month, day] = dateStr.split('-');
                          return `${month}월 ${day}일`;
                        })()}
                        {' ~ '}
                        {product.endRent ? (() => {
                          const dateStr = product.endRent.split('T')[0];
                          const [year, month, day] = dateStr.split('-');
                          return `${month}월 ${day}일`;
                        })() : '제한 없음'}
                      </span>
                    </div>
                  )}
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
                      <button
                        key={index}
                        onClick={() => navigate('/products', {
                          state: {
                            filterByHashtag: { id: tag.id || index, name: tag.name || tag }
                          }
                        })}
                        className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full hover:bg-gray-200 transition-colors cursor-pointer"
                      >
                        #{typeof tag === 'string' ? tag : tag.name}
                      </button>
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

          {/* 모바일 하단 고정 바 - uploadType에 따라 다른 버튼 */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-20">
            {product.uploadType === 'RENT' ? (
              // 빌려드려요: 캘린더 모달 열기
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
            ) : (
              // 빌려요: 바로 채팅하기
              <button
                disabled={isOwnProduct}
                onClick={async () => {
                  if (!isAuthenticated || !user) {
                    alert('로그인이 필요합니다.');
                    navigate(ROUTE_PATHS.LOGIN);
                    return;
                  }
                  if (isOwnProduct) {
                    alert('본인이 등록한 글입니다.');
                    return;
                  }
                  try {
                    const chatRoomData = await chatApi.createChatRoom(product.id);

                    // BORROW 상품의 경우 희망 조건 정보를 전달
                    const navigationState = {
                      productId: product.id,
                      chatRoomData,
                      isBorrowRequest: true,
                      borrowInfo: {
                        desiredStartDate: product.startRent,
                        desiredEndDate: product.endRent,
                        desiredRentalFee: product.price,
                        desiredDeposit: product.deposit,
                        rentMethod: product.rentMethod
                      }
                    };

                    navigate(`/chats/${chatRoomData.chatRoomId}`, {
                      state: navigationState
                    });
                  } catch (error) {
                    console.error('채팅방 생성 실패:', error);
                    alert('채팅방 생성에 실패했습니다.');
                  }
                }}
                className="w-full bg-gray-900 text-white py-4 rounded-lg font-semibold hover:bg-black transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {isOwnProduct ? '본인 글입니다' : '채팅으로 제안하기'}
              </button>
            )}
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
                    availableStartDate={product.startRent}
                    availableEndDate={product.endRent}
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
                    disabled={isOwnProduct || !dateRange || !dateRange.start || !dateRange.end}
                    onClick={handleRentRequest}
                    className="flex-1 bg-gray-900 text-white py-3 rounded-lg font-semibold hover:bg-black transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {isOwnProduct ? '본인 상품입니다' : '대여 요청하기'}
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
