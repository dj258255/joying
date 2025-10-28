/**
 * BorrowedHistoryPage Component
 * 빌린 내역 상세 페이지
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SideNavbar from '../../../shared/components/Navbar/SideNavbar';
import ReviewCard from '../../review/components/ReviewCard';
import ProfileImage from '../../../shared/components/ProfileImage';
import ProductCard from '../components/ProductCard';
import { DUMMY_RENTAL_HISTORY, DUMMY_USERS, DUMMY_REVIEWS, DUMMY_PRODUCTS } from '../../../shared/constants/dummyData';

const BorrowedHistoryPage = () => {
  const { rentalId } = useParams();
  const navigate = useNavigate();
  const [rental, setRental] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeReviewTab, setActiveReviewTab] = useState('myReview'); // 'myReview' | 'ownerReview'
  
  // 모달 상태들
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewContent, setReviewContent] = useState('');

  useEffect(() => {
    loadRentalHistory();
  }, [rentalId]);

  const loadRentalHistory = () => {
    try {
      setLoading(true);
      
      // 빌린 내역에서 해당 rental 찾기
      const foundRental = DUMMY_RENTAL_HISTORY.borrowed.find(r => r.id === rentalId);
      
      if (!foundRental) {
        console.error('대여 내역을 찾을 수 없습니다:', rentalId);
        navigate('/404');
        return;
      }
      
      setRental(foundRental);
    } catch (error) {
      console.error('대여 내역 로딩 중 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed': return '완료';
      case 'pending': return '대기중';
      case 'cancelled': return '취소됨';
      default: return status;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // 정밀한 별점 렌더링 함수
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
      const clipId = `clip-${idx}-${rating}`;
      const pathId = `path-${idx}-${rating}`;

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

  // 리뷰 데이터 가져오기
  const getReviews = () => {
    if (!rental) return { myReview: null, ownerReview: null };
    
    // 내가 작성한 리뷰 (빌렸을 때)
    const myReview = DUMMY_REVIEWS.find(r => 
      r.productId === rental.productId && 
      r.reviewerId === 101 && 
      r.revieweeId === rental.ownerId
    );
    
    // 상대가 작성한 리뷰 (빌려줬을 때)
    const ownerReview = DUMMY_REVIEWS.find(r => 
      r.productId === rental.productId && 
      r.reviewerId === rental.ownerId && 
      r.revieweeId === 101
    );
    
    return { myReview, ownerReview };
  };

  // 캘린더 렌더링 함수
  const renderCalendar = () => {
    if (!rental) return null;

    const startDate = new Date(rental.startDate);
    const endDate = new Date(rental.endDate);
    
    // 시작일과 종료일이 다른 월에 있는 경우를 고려
    const startMonth = startDate.getMonth();
    const startYear = startDate.getFullYear();
    const endMonth = endDate.getMonth();
    const endYear = endDate.getFullYear();
    
    // 시작일이 속한 월의 캘린더를 표시
    const displayMonth = startMonth;
    const displayYear = startYear;

    const getDaysInMonth = (date) => {
      const year = date.getFullYear();
      const month = date.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startingDay = firstDay.getDay();

      const days = [];
      for (let i = 0; i < startingDay; i++) {
        days.push(null);
      }
      for (let day = 1; day <= daysInMonth; day++) {
        days.push(new Date(year, month, day));
      }
      return days;
    };

    const isInRange = (date) => {
      if (!date) return false;
      return date >= startDate && date <= endDate;
    };

    const days = getDaysInMonth(new Date(displayYear, displayMonth));

    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {displayYear}년 {displayMonth + 1}월
          </h3>
        </div>
        
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 gap-1 mb-3">
          {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
            <div key={day} className="text-center text-sm font-semibold text-gray-700 py-2">
              {day}
            </div>
          ))}
        </div>
        
        {/* 날짜 그리드 */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((date, index) => {
            if (!date) {
              return <div key={index} className="h-10"></div>;
            }
            
            const isSelected = isInRange(date);
            const isToday = date.toDateString() === new Date().toDateString();
            
            return (
              <div
                key={index}
                className={`h-10 flex items-center justify-center text-sm rounded-lg transition-all duration-200 ${
                  isSelected
                    ? 'bg-blue-600 text-white font-bold shadow-md'
                    : isToday
                    ? 'bg-gray-200 text-gray-800 font-semibold'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                }`}
              >
                {date.getDate()}
              </div>
            );
          })}
        </div>
        
        {/* 범례 */}
        <div className="flex items-center justify-center gap-4 mt-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-600 rounded"></div>
            <span className="text-gray-600">대여 기간</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gray-200 rounded"></div>
            <span className="text-gray-600">오늘</span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!rental) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">대여 내역을 찾을 수 없습니다</h2>
          <button
            onClick={() => navigate('/mypage')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            마이페이지로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SideNavbar />
      
      <div className="p-6 max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/mypage')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">빌린 내역 상세</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 상단 왼쪽: 상품 정보 */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">상품 정보</h2>
            
            <ProductCard
              product={rental.product}
              actionType="view"
              status={rental.status}
              onClick={() => navigate(`/products/${rental.product.id}`)}
            />
          </div>

          {/* 상단 오른쪽: 판매자 정보 */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">판매자 정보</h2>
            
            <div className="text-center mb-4">
              <ProfileImage 
                src={rental.owner.profileImageUrl}
                alt={rental.owner.username}
                size={80}
                className="w-20 h-20 mx-auto mb-4"
              />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{rental.owner.username} 님 (Owner)</h3>
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="flex gap-1">
                  {renderPreciseStars(rental.owner.rating)}
                </div>
                <span className="text-sm text-gray-600">{rental.owner.rating} (124개 리뷰)</span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => setShowProfileModal(true)}
                className="w-full px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                프로필 보기
              </button>
              <button
                onClick={() => navigate(`/chats/${rental.ownerId}`)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                메시지 보내기
              </button>
            </div>
          </div>

          {/* 중간 왼쪽: 대여 기간 */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">대여 기간</h2>
            {renderCalendar()}
          </div>

          {/* 하단 왼쪽: 결제 정보 */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">결제 정보</h2>
            
            <div className="space-y-3 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">총 대여료</span>
                <span className="font-bold text-lg text-gray-900">{rental.totalPrice.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">보증금</span>
                <span className="font-bold text-lg text-gray-900">5,000원</span>
              </div>
            </div>

            <button 
              onClick={() => setShowPaymentModal(true)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              결제 상세 정보
            </button>
          </div>

          {/* 중간 오른쪽: 판매자가 남긴 리뷰 */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">판매자가 남긴 리뷰</h2>
            
            {(() => {
              const { ownerReview } = getReviews();
              if (ownerReview) {
                return (
                  <div>
                    <p className="text-gray-700 mb-3">"{ownerReview.content}"</p>
                    <div className="text-sm text-gray-500">
                      {ownerReview.reviewer?.username} • {formatDate(ownerReview.createdAt)}
                    </div>
                  </div>
                );
              } else {
                return (
                  <div className="text-center py-8">
                    <p className="text-gray-600">판매자가 아직 리뷰를 작성하지 않았습니다.</p>
                  </div>
                );
              }
            })()}
          </div>

          {/* 하단 오른쪽: 내가 남긴 리뷰 */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">내가 남긴 리뷰</h2>
            
            {(() => {
              const { myReview } = getReviews();
              if (myReview) {
                return (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <svg
                            key={i}
                            className={`w-4 h-4 ${i < myReview.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                    </div>
                    <p className="text-gray-700 mb-3">"{myReview.content}"</p>
                    <div className="text-sm text-gray-500">
                      {formatDate(myReview.createdAt)}
                    </div>
                  </div>
                );
              } else {
                return (
                  <div className="text-center py-8">
                    <div className="flex justify-center mb-3">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          className="w-6 h-6 text-gray-300"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      ))}
                    </div>
                    <p className="text-gray-600 mb-4">아직 리뷰를 작성하지 않았습니다.<br />리뷰를 남겨주세요!</p>
                    <button 
                      onClick={() => setShowReviewModal(true)}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      리뷰 작성하기
                    </button>
                  </div>
                );
              }
            })()}
          </div>
        </div>
      </div>

      {/* 결제 상세 정보 모달 */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto scrollbar-hide">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">결제 상세 정보</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">거래 정보</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">거래 ID</span>
                    <span className="font-medium">{rental.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">거래 상태</span>
                    <span className={`px-2 py-1 rounded-full text-sm ${
                      rental.status === 'completed' ? 'bg-green-100 text-green-800' : 
                      rental.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-red-100 text-red-800'
                    }`}>
                      {rental.status === 'completed' ? '완료' : 
                       rental.status === 'pending' ? '진행중' : '취소'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">신청일</span>
                    <span className="font-medium">{formatDate(rental.createdAt)}</span>
                  </div>
                  {rental.completedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">완료일</span>
                      <span className="font-medium">{formatDate(rental.completedAt)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">결제 정보</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">일일 대여료</span>
                    <span className="font-medium">{rental.product.price.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">대여 일수</span>
                    <span className="font-medium">
                      {Math.ceil((new Date(rental.endDate) - new Date(rental.startDate)) / (1000 * 60 * 60 * 24))}일
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">총 대여료</span>
                    <span className="font-medium">{rental.totalPrice.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">보증금</span>
                    <span className="font-medium">5,000원</span>
                  </div>
                  <hr className="my-2" />
                  <div className="flex justify-between font-bold text-lg text-gray-900">
                    <span>총 결제금액</span>
                    <span>{(rental.totalPrice + 5000).toLocaleString()}원</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">결제 방법</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">결제 수단</span>
                    <span className="font-medium">카드 결제</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">카드 번호</span>
                    <span className="font-medium">****-****-****-1234</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 리뷰 작성 모달 */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">리뷰 작성</h3>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">평점</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => {
                        if (reviewRating === star) {
                          setReviewRating(star - 0.5);
                        } else {
                          setReviewRating(star);
                        }
                      }}
                      className="relative"
                    >
                      <svg
                        className={`w-8 h-8 transition-colors ${
                          star <= reviewRating ? 'text-yellow-400' : 'text-gray-300'
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {/* 반별 표시를 위한 오버레이 */}
                      {reviewRating === star - 0.5 && (
                        <div className="absolute inset-0 overflow-hidden">
                          <svg
                            className="w-8 h-8 text-yellow-400"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                            style={{ clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0 100%)' }}
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <div className="text-sm text-gray-600 mt-2">
                  현재 평점: {reviewRating}점
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">리뷰 내용</label>
                <textarea
                  value={reviewContent}
                  onChange={(e) => setReviewContent(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  placeholder="리뷰를 작성해주세요..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={() => {
                    // 리뷰 저장 로직
                    console.log('리뷰 저장:', { rating: reviewRating, content: reviewContent });
                    setShowReviewModal(false);
                    setReviewRating(0);
                    setReviewContent('');
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  작성하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 프로필 보기 모달 */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto scrollbar-hide">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">프로필 보기</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowProfileModal(false);
                    navigate(`/members/${rental.ownerId}`);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  화면 키우기
                </button>
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 왼쪽: 프로필 정보 */}
              <div className="lg:col-span-1">
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                  <div className="text-center mb-6">
                    <ProfileImage 
                      src={rental.owner.profileImageUrl}
                      alt={rental.owner.username}
                      size={80}
                      className="w-20 h-20 mx-auto mb-4"
                    />
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">{rental.owner.username}</h2>
                    <p className="text-gray-500 text-sm mb-2">{rental.owner.bio || '소개가 없습니다.'}</p>
                    
                    {/* 정확한 별점 표시 */}
                    <div className="flex items-center justify-center gap-3 mb-4">
                      <div className="flex gap-1">
                        {(() => {
                          const calcStarRates = () => {
                            let tempStarRatesArr = [0, 0, 0, 0, 0];
                            let starScore = rental.owner.rating;

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
                            const clipId = `clip-${idx}-${rental.owner.rating}`;
                            const pathId = `path-${idx}-${rental.owner.rating}`;

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
                        })()}
                      </div>
                      <span className="text-sm font-medium text-gray-600">{rental.owner.rating}</span>
                    </div>
                  </div>

                  {/* 기본 정보 */}
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between">
                      <span className="text-gray-600">이메일</span>
                      <span className="text-gray-900">{rental.owner.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">성별</span>
                      <span className="text-gray-900">{rental.owner.gender === 'M' ? '남성' : '여성'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">나이</span>
                      <span className="text-gray-900">{new Date().getFullYear() - new Date(rental.owner.birth).getFullYear()}세</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">활동 기간</span>
                      <span className="text-gray-900">
                        {Math.ceil((new Date() - new Date(rental.owner.createdAt)) / (1000 * 60 * 60 * 24))}일째 활동중
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setShowProfileModal(false);
                      navigate(`/chats/${rental.ownerId}`);
                    }}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    메시지 보내기
                  </button>
                </div>
              </div>

              {/* 오른쪽: 등록 상품 및 리뷰 */}
              <div className="lg:col-span-2 space-y-6">
                {/* 등록 상품 */}
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">등록 상품</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {DUMMY_PRODUCTS.filter(p => p.sellerId === rental.ownerId).slice(0, 4).map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        actionType="view"
                        status="available"
                        onClick={() => navigate(`/products/${product.id}`)}
                      />
                    ))}
                  </div>
                </div>

                {/* 리뷰 섹션 */}
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">리뷰</h3>
                  <div className="space-y-4">
                    {DUMMY_REVIEWS.filter(r => r.revieweeId === rental.ownerId).slice(0, 3).map((review) => (
                      <ReviewCard
                        key={review.id}
                        review={review}
                        showProductInfo={true}
                        showRating={true}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BorrowedHistoryPage;

