/**
 * LentHistoryPage Component
 * 빌려준 내역 상세 페이지
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SideNavbar from '../../../shared/components/Navbar/SideNavbar';
import ReviewCard from '../../review/components/ReviewCard';
import ProfileImage from '../../../shared/components/ProfileImage';
import ProductCardByProductId from '../components/ProductCardByProductId';
import { rentalApi } from '@/features/rental/api/rentalApi';
import { useReviewWrite } from '@/features/review/hooks/useReviewWrite';
import { reviewApi } from '@/features/review/api/reviewApi';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useUserProfile } from '@/features/user/hooks/useUserProfile';
import { fileApi } from '@/shared/api/fileApi';
import { useRef } from 'react';
import CustomAlert from '../../../shared/components/CustomAlert';
import CustomConfirm from '../../../shared/components/CustomConfirm';

const LentHistoryPage = () => {
  const { rentalId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [rental, setRental] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeReviewTab, setActiveReviewTab] = useState('myReview'); // 'myReview' | 'renterReview'
  
  // 리뷰 작성 훅
  const { createReview, updateReview, deleteReview, isCreating: isCreatingReview, isUpdating: isUpdatingReview, isDeleting: isDeletingReview } = useReviewWrite();
  
  // 리뷰 데이터 상태
  const [myReview, setMyReview] = useState(null); // 내가 작성한 리뷰 (빌려준 사람이 빌린 사람에 대한 리뷰)
  const [renterReview, setRenterReview] = useState(null); // 대여자가 작성한 리뷰 (빌린 사람이 상품에 대한 리뷰)
  const [loadingReviews, setLoadingReviews] = useState(false);
  
  // 대여자 정보 조회 (별점 포함)
  const renterMemberId = rental?.renter?.memberId;
  const { user: renterUser } = useUserProfile(renterMemberId);
  const renterRating = renterUser?.rating || rental?.renter?.rating || 0;
  
  // 커스텀 알림 상태
  const [alertMessage, setAlertMessage] = useState(null);
  const [alertType, setAlertType] = useState('success');
  const [confirmMessage, setConfirmMessage] = useState(null);
  const [confirmCallback, setConfirmCallback] = useState(null);
  
  // 모달 상태들
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showEditReviewModal, setShowEditReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewContent, setReviewContent] = useState('');
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewFileIds, setReviewFileIds] = useState([]);
  const [reviewImagePreviews, setReviewImagePreviews] = useState([]);
  const [reviewUploading, setReviewUploading] = useState(false);
  const [originalReviewFileIds, setOriginalReviewFileIds] = useState([]); // 원본 fileIds 저장
  const [reviewIdToDelete, setReviewIdToDelete] = useState(null); // 삭제할 리뷰 ID 저장
  const reviewFileInputRef = useRef(null);

  useEffect(() => {
    loadRentalHistory();
  }, [rentalId]);

  useEffect(() => {
    if (rentalId) {
      loadReviews();
    }
  }, [rentalId]);

  const loadRentalHistory = async () => {
    try {
      setLoading(true);
      
      // API 호출로 대여 내역 조회
      const response = await rentalApi.getRentalDetail(rentalId);
      
      // 응답 구조: { status, message, data: {... }, timestamp }
      // 또는 axios 응답: { data: { status, message, data: {... }, timestamp } }
      const rentalData = response?.data?.data || response?.data || response;
      
      if (!rentalData) {
        console.error('대여 내역을 찾을 수 없습니다:', rentalId);
        navigate('/404');
        return;
      }
      
      console.log('[LentHistoryPage] 대여 내역 로드 완료:', rentalData);
      setRental(rentalData);
    } catch (error) {
      console.error('대여 내역 로딩 중 오류:', error);
      navigate('/404');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'ESCROW': return 'bg-blue-100 text-blue-800';
      case 'SHIPPED': return 'bg-indigo-100 text-indigo-800';
      case 'RENTING': return 'bg-blue-100 text-blue-800';
      case 'RETURN_REQUESTED': return 'bg-purple-100 text-purple-800';
      case 'RETURNED': return 'bg-teal-100 text-teal-800';
      case 'DEPOSIT_RETURNED': return 'bg-green-100 text-green-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // 상태 텍스트 변환 (RentalStatus enum에 맞게)
  const getStatusText = (status) => {
    switch (status) {
      case 'PENDING': return '결제 대기';
      case 'ESCROW': return '보증금 보관';
      case 'SHIPPED': return '발송 완료';
      case 'RENTING': return '대여 중';
      case 'RETURN_REQUESTED': return '반납 요청';
      case 'RETURNED': return '회수 완료';
      case 'DEPOSIT_RETURNED': return '거래 완료';
      case 'COMPLETED': return '거래 완료';
      case 'CANCELLED': return '거래 취소';
      default: return '거래 대기';
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
  const loadReviews = async (retryCount = 0) => {
    if (!rentalId) return;
    
    try {
      setLoadingReviews(true);
      
      // 내가 작성한 리뷰 조회 (빌려준 사람이 빌린 사람에 대한 리뷰)
      // 백엔드 쿼리: uploadType='BORROW' AND reviewed=rh.member → 빌린 사람에 대한 리뷰 (빌려준 사람이 작성)
      try {
        const myReviewResponse = await reviewApi.getRentalReview(rentalId, 'borrow');
        // API 응답 구조: { status, message, data: { reviewId, title, content, rating, reviewerName } }
        const myReviewData = myReviewResponse?.data?.data;
        if (myReviewData && myReviewData.reviewId) {
          setMyReview(myReviewData);
        } else {
          setMyReview(null);
        }
      } catch (error) {
        // 404는 리뷰가 없다는 의미이므로 null로 설정
        if (error.response?.status === 404) {
          setMyReview(null);
        } else {
          console.error('내 리뷰 조회 실패:', error);
          setMyReview(null);
        }
      }
      
      // 대여자가 작성한 리뷰 조회 (빌린 사람이 작성한 리뷰)
      // 백엔드 쿼리: uploadType='RENT' AND reviewer=rh.member → 빌린 사람이 작성한 리뷰
      try {
        const renterReviewResponse = await reviewApi.getRentalReview(rentalId, 'rent');
        const renterReviewData = renterReviewResponse?.data?.data;
        if (renterReviewData && renterReviewData.reviewId) {
          setRenterReview(renterReviewData);
        } else {
          setRenterReview(null);
        }
      } catch (error) {
        // 404는 리뷰가 없다는 의미이므로 null로 설정
        if (error.response?.status === 404) {
          setRenterReview(null);
        } else {
          console.error('대여자 리뷰 조회 실패:', error);
          setRenterReview(null);
        }
      }
    } catch (error) {
      console.error('리뷰 조회 중 오류:', error);
    } finally {
      setLoadingReviews(false);
    }
  };

  // 리뷰 조회 재시도 헬퍼 함수
  const retryLoadMyReview = async (type = 'borrow', maxRetries = 5) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await reviewApi.getRentalReview(rentalId, type);
        const reviewData = response?.data?.data;
        
        if (reviewData && reviewData.reviewId) {
          setMyReview(reviewData);
          return true; // 성공
        }
        
        // 리뷰가 아직 없으면 재시도
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        // 404는 리뷰가 아직 없다는 의미이므로 재시도
        if (error.response?.status === 404) {
          if (i < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } else {
          console.error(`리뷰 조회 시도 ${i + 1} 실패:`, error);
          if (i < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }
    }
    return false; // 실패
  };

  // 거래 완료 상태 확인
  const isCompleted = () => {
    if (!rental) return false;
    return rental.status === 'DEPOSIT_RETURNED' || rental.status === 'COMPLETED';
  };

  // 캘린더 렌더링 함수
  const renderCalendar = () => {
    if (!rental) return null;

    const startDate = new Date(rental.startRen);
    const endDate = new Date(rental.endRen);
    
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
      return (date >= startDate && date <= endDate) || 
             (date.toDateString() === startDate.toDateString()) || 
             (date.toDateString() === endDate.toDateString());
    };

    const days = getDaysInMonth(new Date(displayYear, displayMonth));

    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-3 border border-gray-200">
        <div className="text-center mb-2">
          <h3 className="text-base font-semibold text-gray-900">
            {displayYear}년 {displayMonth + 1}월
          </h3>
        </div>
        
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-gray-700 py-1">
              {day}
            </div>
          ))}
        </div>
        
        {/* 날짜 그리드 */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((date, index) => {
            if (!date) {
              return <div key={index} className="h-8"></div>;
            }
            
            const isSelected = isInRange(date);
            const isToday = date.toDateString() === new Date().toDateString();
            
            return (
              <div
                key={index}
                className={`h-8 flex items-center justify-center text-xs rounded-lg transition-all duration-200 ${
                  isSelected
                    ? 'bg-gray-900 text-white font-bold shadow-md'
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
        <div className="flex items-center justify-center gap-3 mt-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-gray-900 rounded"></div>
            <span className="text-gray-600">대여 기간</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-gray-200 rounded"></div>
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
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
            className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
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
      
      {/* 커스텀 알림 */}
      {alertMessage && (
        <CustomAlert
          message={alertMessage}
          type={alertType}
          onClose={() => {
            setAlertMessage(null);
            setAlertType('success');
          }}
        />
      )}
      
      {/* 커스텀 확인 모달 */}
      {confirmMessage && reviewIdToDelete !== null && (
        <CustomConfirm
          message={confirmMessage}
          onConfirm={async () => {
            // 확인 버튼을 클릭했을 때만 실행되는 삭제 로직
            if (!reviewIdToDelete) return;
            
            try {
              await deleteReview(reviewIdToDelete);
              setAlertMessage('리뷰가 삭제되었습니다.');
              setAlertType('success');
              setMyReview(null);
              
              // 모달 먼저 닫기
              setConfirmMessage(null);
              setReviewIdToDelete(null);
              setConfirmCallback(null);
              
              // 리뷰 목록 다시 로드 (에러가 나도 무시)
              try {
                await loadReviews();
              } catch (loadError) {
                console.error('리뷰 조회 실패:', loadError);
                // 조회 실패는 무시 (이미 모달은 닫힘)
              }
            } catch (error) {
              console.error('리뷰 삭제 실패:', error);
              setAlertMessage('리뷰 삭제에 실패했습니다.');
              setAlertType('error');
              // 삭제 실패 시에도 모달 닫기
              setConfirmMessage(null);
              setReviewIdToDelete(null);
              setConfirmCallback(null);
            }
          }}
          onCancel={() => {
            setConfirmMessage(null);
            setReviewIdToDelete(null);
            setConfirmCallback(null);
          }}
          type="warning"
        />
      )}
      
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
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 상단 왼쪽: 상품 정보 */}
          <div className="bg-white rounded-2xl shadow-lg p-4">
            <h2 className="text-lg font-bold text-gray-900 mb-3">상품 정보</h2>
            
            <ProductCardByProductId
              productId={rental.product?.productId}
              status={
                rental.status === 'DEPOSIT_RETURNED' || rental.status === 'COMPLETED' ? 'completed' :
                rental.status === 'RENTING' ? 'rented' :
                rental.status === 'CANCELLED' ? 'unavailable' :
                rental.status === 'PENDING' || rental.status === 'ESCROW' ? 'pending' :
                'available'
              }
              onClick={() => navigate(`/products/${rental.product?.productId}`)}
            />
          </div>

          {/* 상단 오른쪽: 대여자 정보 */}
          <div className="bg-white rounded-2xl shadow-lg p-4 flex flex-col">
            <h2 className="text-lg font-bold text-gray-900 mb-3">대여자 정보</h2>
            
            <div className="flex-1 flex flex-col justify-center">
              <div className="text-center mb-3">
                <ProfileImage
                  src={renterUser?.profileImageUrl || renterUser?.profile_image_url || rental.renter?.profileImage || rental.renter?.profileImageUrl || null}
                  alt={renterUser?.nickname || renterUser?.name || rental.renter?.nickname || rental.renter?.name || '대여자'}
                  size={64}
                  className="w-16 h-16 mx-auto mb-2"
                />
                <h3 className="text-base font-semibold text-gray-900 mb-1">{renterUser?.nickname || renterUser?.name || rental.renter?.nickname || rental.renter?.name} 님</h3>
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="flex gap-1">
                    {renderPreciseStars(Number(renterRating) || 0)}
                  </div>
                  <span className="text-sm text-gray-600">{Number(renterRating) || 0}</span>
                </div>
              </div>

              <div className="space-y-2 flex flex-col items-center">
                <button
                  onClick={() => navigate(`/members/${rental.renter?.memberId}`)}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  프로필 보기
                </button>
              </div>
            </div>
          </div>

          {/* 중간 왼쪽: 대여 기간 */}
          <div className="bg-white rounded-2xl shadow-lg p-4">
            <h2 className="text-lg font-bold text-gray-900 mb-3">대여 기간</h2>
            {renderCalendar()}
          </div>

          {/* 하단 왼쪽: 결제 정보 */}
          <div className="bg-white rounded-2xl shadow-lg p-4">
            <h2 className="text-lg font-bold text-gray-900 mb-3">결제 정보</h2>
            
            <div className="space-y-3 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">총 대여료</span>
                <span className="font-bold text-lg text-gray-900">{rental.fee?.toLocaleString() || 0}원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">보증금</span>
                <span className="font-bold text-lg text-gray-900">{rental.deposit?.toLocaleString() || 0}원</span>
              </div>
            </div>

            <button 
              onClick={() => setShowPaymentModal(true)}
              className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              결제 상세 정보
            </button>
          </div>

          {/* 중간 오른쪽: 대여자가 남긴 리뷰 */}
          <div className="bg-white rounded-2xl shadow-lg p-4">
            <h2 className="text-lg font-bold text-gray-900 mb-3">대여자가 남긴 리뷰</h2>
            
            {loadingReviews ? (
              <div className="text-center py-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
                <p className="text-gray-600 text-sm">로딩 중...</p>
              </div>
            ) : renterReview ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex">
                    {renderPreciseStars(renterReview.rating || 0)}
                  </div>
                  <span className="text-sm text-gray-600">{renterReview.rating || 0}</span>
                </div>
                {renterReview.title && (
                  <h4 className="font-semibold text-gray-900 mb-1.5 text-sm">{renterReview.title}</h4>
                )}
                <p className="text-gray-700 mb-2 text-sm">"{renterReview.content}"</p>
                {/* 리뷰 이미지 표시 */}
                {renterReview.imageUrls && renterReview.imageUrls.length > 0 && (
                  <div className="mb-2 flex gap-2 overflow-x-auto">
                    {renterReview.imageUrls.map((imageUrl, imgIndex) => (
                      <img
                        key={imgIndex}
                        src={imageUrl}
                        alt={`리뷰 이미지 ${imgIndex + 1}`}
                        className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                      />
                    ))}
                  </div>
                )}
                <div className="text-xs text-gray-500">
                  {renterReview.reviewerName || '대여자'} • {renterReview.createdAt ? formatDate(renterReview.createdAt) : ''}
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-600 text-sm">대여자가 아직 리뷰를 작성하지 않았습니다.</p>
              </div>
            )}
          </div>

          {/* 하단 오른쪽: 내가 남긴 리뷰 */}
          <div className="bg-white rounded-2xl shadow-lg p-4">
            <h2 className="text-lg font-bold text-gray-900 mb-3">내가 남긴 리뷰</h2>
            
            {loadingReviews ? (
              <div className="text-center py-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
                <p className="text-gray-600 text-sm">로딩 중...</p>
              </div>
            ) : myReview ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex">
                    {renderPreciseStars(myReview.rating || 0)}
                  </div>
                  <span className="text-sm text-gray-600">{myReview.rating || 0}</span>
                </div>
                {myReview.title && (
                  <h4 className="font-semibold text-gray-900 mb-1.5 text-sm">{myReview.title}</h4>
                )}
                <p className="text-gray-700 mb-2 text-sm">"{myReview.content}"</p>
                {/* 리뷰 이미지 표시 */}
                {myReview.imageUrls && myReview.imageUrls.length > 0 && (
                  <div className="mb-2 flex gap-2 overflow-x-auto">
                    {myReview.imageUrls.map((imageUrl, imgIndex) => (
                      <img
                        key={imgIndex}
                        src={imageUrl}
                        alt={`리뷰 이미지 ${imgIndex + 1}`}
                        className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                      />
                    ))}
                  </div>
                )}
                <div className="text-xs text-gray-500 mb-3">
                  {formatDate(myReview.createdAt || new Date())}
                </div>
                <div className="flex gap-2">
                <button
                  onClick={() => {
                    setReviewTitle(myReview.title || '');
                    setReviewContent(myReview.content || '');
                    setReviewRating(myReview.rating || 0);
                    // 기존 이미지 정보 복원 (유효한 fileId만 포함)
                    const existingFileIds = myReview.imageFileIds || myReview.fileIds || [];
                    const validExistingFileIds = existingFileIds.filter(id => id != null && id !== undefined && id !== 0 && typeof id === 'number');
                    setReviewFileIds(validExistingFileIds);
                    setOriginalReviewFileIds([...validExistingFileIds]); // 원본 저장 (깊은 복사)
                    setReviewImagePreviews(myReview.imageUrls || []);
                    setShowEditReviewModal(true);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  수정
                </button>
                  <button
                    onClick={() => {
                      // 삭제할 리뷰 ID를 저장하고 모달만 표시
                      setReviewIdToDelete(myReview.reviewId);
                      setConfirmMessage('리뷰를 삭제하시겠습니까?');
                      setConfirmCallback(() => {}); // 빈 함수로 설정 (실제 실행은 handleConfirmDelete에서)
                    }}
                    disabled={isDeletingReview}
                    className="flex-1 px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {isDeletingReview ? '삭제 중...' : '삭제'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                {isCompleted() ? (
                  <button 
                    onClick={() => setShowReviewModal(true)}
                    className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    리뷰 작성하기
                  </button>
                ) : (
                  <p className="text-gray-600">거래 완료 후 리뷰를 작성할 수 있습니다.</p>
                )}
              </div>
            )}
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
                    <span className="font-medium text-gray-900">{rental.rentalHisId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">거래 상태</span>
                    <span className={`px-2 py-1 rounded-full text-sm ${
                      rental.status === 'DEPOSIT_RETURNED' || rental.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                      rental.status === 'RENTING' ? 'bg-blue-100 text-blue-800' :
                      rental.status === 'RETURNED' ? 'bg-teal-100 text-teal-800' :
                      rental.status === 'RETURN_REQUESTED' ? 'bg-purple-100 text-purple-800' :
                      rental.status === 'SHIPPED' ? 'bg-indigo-100 text-indigo-800' :
                      rental.status === 'ESCROW' ? 'bg-cyan-100 text-cyan-800' :
                      rental.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      rental.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {rental.status === 'DEPOSIT_RETURNED' ? '거래 완료' :
                       rental.status === 'COMPLETED' ? '거래 완료' :
                       rental.status === 'RETURNED' ? '회수 완료' :
                       rental.status === 'RETURN_REQUESTED' ? '반납 요청' :
                       rental.status === 'RENTING' ? '대여 중' :
                       rental.status === 'SHIPPED' ? '발송 완료' :
                       rental.status === 'ESCROW' ? '보증금 보관' :
                       rental.status === 'PENDING' ? '결제 대기' :
                       rental.status === 'CANCELLED' ? '거래 취소' : rental.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">대여 시작일</span>
                    <span className="font-medium text-gray-900">{formatDate(rental.startRen)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">대여 종료일</span>
                    <span className="font-medium text-gray-900">{formatDate(rental.endRen)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">결제 정보</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">대여 일수</span>
                    <span className="font-medium text-gray-900">
                      {Math.ceil((new Date(rental.endRen) - new Date(rental.startRen)) / (1000 * 60 * 60 * 24))}일
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">총 대여료</span>
                    <span className="font-medium text-gray-900">{rental.fee?.toLocaleString() || 0}원</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">보증금</span>
                    <span className="font-medium text-gray-900">{rental.deposit?.toLocaleString() || 0}원</span>
                  </div>
                  <hr className="my-2" />
                  <div className="flex justify-between font-bold text-lg text-gray-900">
                    <span>총 결제금액</span>
                    <span>{((rental.fee || 0) + (rental.deposit || 0)).toLocaleString()}원</span>
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
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto scrollbar-hide">
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  리뷰 제목 (선택)
                  <span className="ml-2 text-xs text-gray-500">({reviewTitle.length}/20)</span>
                </label>
                <input
                  type="text"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value.slice(0, 20))}
                  maxLength={20}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent text-gray-900 mb-4"
                  placeholder="리뷰 제목을 입력해주세요..."
                />
                {reviewTitle.length >= 18 && (
                  <p className="text-xs text-orange-600 mt-1">제목은 최대 20자까지 입력 가능합니다.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  리뷰 내용
                  <span className="ml-2 text-xs text-gray-500">({reviewContent.length}/100)</span>
                </label>
                <textarea
                  value={reviewContent}
                  onChange={(e) => setReviewContent(e.target.value.slice(0, 100))}
                  maxLength={100}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent text-gray-900 resize-none overflow-y-auto scrollbar-hide"
                  rows={4}
                  placeholder="리뷰를 작성해주세요..."
                />
                {reviewContent.length >= 90 && (
                  <p className="text-xs text-orange-600 mt-1">내용은 최대 100자까지 입력 가능합니다.</p>
                )}
              </div>

              {/* 이미지 업로드 섹션 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  이미지 업로드 (선택)
                  <span className="ml-2 text-xs text-gray-500">({reviewImagePreviews.length}/3)</span>
                </label>
                <div
                  onClick={() => {
                    if (reviewImagePreviews.length < 3) {
                      reviewFileInputRef.current?.click();
                    } else {
                      setAlertMessage('이미지는 최대 3개까지 업로드할 수 있습니다.');
                      setAlertType('warning');
                    }
                  }}
                  className={`w-full border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center transition bg-gray-50 ${
                    reviewImagePreviews.length >= 3
                      ? 'border-gray-300 cursor-not-allowed opacity-50'
                      : 'border-gray-300 cursor-pointer hover:border-gray-500'
                  }`}
                >
                  <svg className="w-6 h-6 text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm text-gray-600">
                    {reviewImagePreviews.length >= 3 
                      ? '이미지는 최대 3개까지 업로드할 수 있습니다.' 
                      : '클릭하여 이미지 추가 (최대 3개)'}
                  </p>
                  <input
                    ref={reviewFileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length === 0) return;
                      
                      // 최대 3개 제한
                      const currentCount = reviewImagePreviews.length;
                      const remainingSlots = 3 - currentCount;
                      
                      if (remainingSlots <= 0) {
                        setAlertMessage('이미지는 최대 3개까지 업로드할 수 있습니다.');
                        setAlertType('warning');
                        e.target.value = '';
                        return;
                      }
                      
                      // 남은 슬롯만큼만 처리
                      const filesToUpload = files.slice(0, remainingSlots);
                      if (files.length > remainingSlots) {
                        setAlertMessage(`${remainingSlots}개의 이미지만 추가되었습니다. (최대 3개)`);
                        setAlertType('info');
                        setTimeout(() => setAlertMessage(null), 3000);
                      }
                      
                      setReviewUploading(true);
                      const localUrls = filesToUpload.map(f => URL.createObjectURL(f));
                      setReviewImagePreviews(prev => [...prev, ...localUrls]);
                      
                      try {
                        const uploadPromises = filesToUpload.map(async (file) => {
                          const uploadResult = await fileApi.uploadFile(file);
                          const fileId = uploadResult.body?.data?.fileId
                            || uploadResult.data?.fileId
                            || uploadResult.body?.fileId
                            || uploadResult.fileId
                            || uploadResult.data?.id;
                          return fileId;
                        });
                        
                        const uploadedFileIds = await Promise.all(uploadPromises);
                        // 유효한 fileId만 추가 (null, undefined, 0, NaN, 음수 제외)
                        const validFileIds = uploadedFileIds.filter(id => 
                          id != null && 
                          id !== undefined && 
                          id !== 0 && 
                          typeof id === 'number' && 
                          !isNaN(id) &&
                          id > 0
                        );
                        setReviewFileIds(prev => [...prev, ...validFileIds]);
                      } catch (err) {
                        console.error('이미지 업로드 실패:', err);
                        setAlertMessage('이미지 업로드에 실패했습니다.');
                        setAlertType('error');
                        // 실패한 이미지 제거
                        setReviewImagePreviews(prev => prev.slice(0, currentCount));
                      } finally {
                        setReviewUploading(false);
                      }
                      
                      e.target.value = '';
                    }}
                    disabled={reviewUploading || reviewImagePreviews.length >= 3}
                  />
                </div>

                {/* 미리보기 */}
                {reviewImagePreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {reviewImagePreviews.map((src, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={src}
                          alt={`preview-${idx}`}
                          className="w-full h-24 object-cover rounded-lg border border-gray-300"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setReviewImagePreviews(prev => prev.filter((_, i) => i !== idx));
                            setReviewFileIds(prev => prev.filter((_, i) => i !== idx));
                          }}
                          className="absolute top-1 right-1 bg-gray-900/80 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {reviewUploading && (
                  <p className="text-sm text-gray-500 mt-2">이미지 업로드 중...</p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowReviewModal(false);
                    setReviewFileIds([]);
                    setReviewImagePreviews([]);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={async () => {
                    if (!reviewRating || !reviewContent.trim()) {
                      setAlertMessage('평점과 리뷰 내용을 입력해주세요.');
                      setAlertType('warning');
                      return;
                    }
                    
                    try {
                      // fileIds 배열 정리: 유효한 값만 포함하고, 빈 배열이면 null로 전송
                      const validFileIds = reviewFileIds.filter(id => id != null && id !== undefined && id !== 0);
                      await createReview({
                        rentalHistoryId: Number(rentalId),
                        title: reviewTitle.trim() || `리뷰`,
                        content: reviewContent.trim(),
                        rating: reviewRating,
                        uploadType: 'RENT', // 빌려준 내역이므로 RENT
                        fileIds: validFileIds.length > 0 ? validFileIds : null
                      });
                      
                      // 모달 닫기 및 상태 초기화
                      setShowReviewModal(false);
                      setReviewRating(0);
                      setReviewContent('');
                      setReviewTitle('');
                      setReviewFileIds([]);
                      setReviewImagePreviews([]);
                      
                      // 리뷰 작성 후 리뷰 조회 (서버 반영을 위해 약간의 지연 후 재시도)
                      setTimeout(async () => {
                        await retryLoadMyReview('borrow');
                        // 전체 리뷰 목록도 다시 로드
                        await loadReviews();
                      }, 500);
                    } catch (error) {
                      console.error('리뷰 작성 실패:', error);
                      setAlertMessage('리뷰 작성에 실패했습니다. 다시 시도해주세요.');
                      setAlertType('error');
                    }
                  }}
                  disabled={isCreatingReview}
                  className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreatingReview ? '작성 중...' : '작성하기'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 리뷰 수정 모달 */}
      {showEditReviewModal && myReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto scrollbar-hide">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">리뷰 수정</h3>
              <button
                onClick={() => {
                  setShowEditReviewModal(false);
                  setReviewTitle('');
                  setReviewContent('');
                  setReviewRating(0);
                  setReviewFileIds([]);
                  setReviewImagePreviews([]);
                }}
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  리뷰 제목 (선택)
                  <span className="ml-2 text-xs text-gray-500">({reviewTitle.length}/20)</span>
                </label>
                <input
                  type="text"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value.slice(0, 20))}
                  maxLength={20}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent text-gray-900 mb-4"
                  placeholder="리뷰 제목을 입력해주세요..."
                />
                {reviewTitle.length >= 18 && (
                  <p className="text-xs text-orange-600 mt-1">제목은 최대 20자까지 입력 가능합니다.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  리뷰 내용
                  <span className="ml-2 text-xs text-gray-500">({reviewContent.length}/100)</span>
                </label>
                <textarea
                  value={reviewContent}
                  onChange={(e) => setReviewContent(e.target.value.slice(0, 100))}
                  maxLength={100}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent text-gray-900 resize-none overflow-y-auto scrollbar-hide"
                  rows={4}
                  placeholder="리뷰를 작성해주세요..."
                />
                {reviewContent.length >= 90 && (
                  <p className="text-xs text-orange-600 mt-1">내용은 최대 100자까지 입력 가능합니다.</p>
                )}
              </div>

              {/* 이미지 업로드 섹션 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  이미지 업로드 (선택)
                  <span className="ml-2 text-xs text-gray-500">({reviewImagePreviews.length}/3)</span>
                </label>
                <div
                  onClick={() => {
                    if (reviewImagePreviews.length < 3) {
                      reviewFileInputRef.current?.click();
                    } else {
                      setAlertMessage('이미지는 최대 3개까지 업로드할 수 있습니다.');
                      setAlertType('warning');
                    }
                  }}
                  className={`w-full border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center transition bg-gray-50 ${
                    reviewImagePreviews.length >= 3
                      ? 'border-gray-300 cursor-not-allowed opacity-50'
                      : 'border-gray-300 cursor-pointer hover:border-gray-500'
                  }`}
                >
                  <svg className="w-6 h-6 text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm text-gray-600">
                    {reviewImagePreviews.length >= 3 
                      ? '이미지는 최대 3개까지 업로드할 수 있습니다.' 
                      : '클릭하여 이미지 추가 (최대 3개)'}
                  </p>
                  <input
                    ref={reviewFileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length === 0) return;
                      
                      // 최대 3개 제한
                      const currentCount = reviewImagePreviews.length;
                      const remainingSlots = 3 - currentCount;
                      
                      if (remainingSlots <= 0) {
                        setAlertMessage('이미지는 최대 3개까지 업로드할 수 있습니다.');
                        setAlertType('warning');
                        e.target.value = '';
                        return;
                      }
                      
                      // 남은 슬롯만큼만 처리
                      const filesToUpload = files.slice(0, remainingSlots);
                      if (files.length > remainingSlots) {
                        setAlertMessage(`${remainingSlots}개의 이미지만 추가되었습니다. (최대 3개)`);
                        setAlertType('info');
                        setTimeout(() => setAlertMessage(null), 3000);
                      }
                      
                      setReviewUploading(true);
                      const localUrls = filesToUpload.map(f => URL.createObjectURL(f));
                      setReviewImagePreviews(prev => [...prev, ...localUrls]);
                      
                      try {
                        const uploadPromises = filesToUpload.map(async (file) => {
                          const uploadResult = await fileApi.uploadFile(file);
                          const fileId = uploadResult.body?.data?.fileId
                            || uploadResult.data?.fileId
                            || uploadResult.body?.fileId
                            || uploadResult.fileId
                            || uploadResult.data?.id;
                          return fileId;
                        });
                        
                        const uploadedFileIds = await Promise.all(uploadPromises);
                        // 유효한 fileId만 추가 (null, undefined, 0, NaN, 음수 제외)
                        const validFileIds = uploadedFileIds.filter(id => 
                          id != null && 
                          id !== undefined && 
                          id !== 0 && 
                          typeof id === 'number' && 
                          !isNaN(id) &&
                          id > 0
                        );
                        setReviewFileIds(prev => [...prev, ...validFileIds]);
                      } catch (err) {
                        console.error('이미지 업로드 실패:', err);
                        setAlertMessage('이미지 업로드에 실패했습니다.');
                        setAlertType('error');
                        // 실패한 이미지 제거
                        setReviewImagePreviews(prev => prev.slice(0, currentCount));
                      } finally {
                        setReviewUploading(false);
                      }
                      
                      e.target.value = '';
                    }}
                    disabled={reviewUploading || reviewImagePreviews.length >= 3}
                  />
                </div>

                {/* 미리보기 */}
                {reviewImagePreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {reviewImagePreviews.map((src, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={src}
                          alt={`preview-${idx}`}
                          className="w-full h-24 object-cover rounded-lg border border-gray-300"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setReviewImagePreviews(prev => prev.filter((_, i) => i !== idx));
                            setReviewFileIds(prev => prev.filter((_, i) => i !== idx));
                          }}
                          className="absolute top-1 right-1 bg-gray-900/80 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {reviewUploading && (
                  <p className="text-sm text-gray-500 mt-2">이미지 업로드 중...</p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowEditReviewModal(false);
                    setReviewTitle('');
                    setReviewContent('');
                    setReviewRating(0);
                    setReviewFileIds([]);
                    setReviewImagePreviews([]);
                    setOriginalReviewFileIds([]);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={async () => {
                    if (!reviewRating || !reviewContent.trim()) {
                      setAlertMessage('평점과 리뷰 내용을 입력해주세요.');
                      setAlertType('warning');
                      return;
                    }
                    
                    try {
                      // fileIds 배열 정리: 유효한 값만 포함
                      const validFileIds = reviewFileIds.filter(id => 
                        id != null && 
                        id !== undefined && 
                        id !== 0 && 
                        typeof id === 'number' && 
                        !isNaN(id) &&
                        id > 0
                      );
                      
                      // 원본 fileIds와 비교하여 변경 여부 확인
                      const originalIds = originalReviewFileIds.map(String).sort().join(',');
                      const currentIds = validFileIds.map(String).sort().join(',');
                      const isFileIdsChanged = originalIds !== currentIds;
                      
                      // fileIds 전송 로직:
                      // 1. 변경되지 않았으면 undefined (백엔드에서 기존 파일 유지)
                      // 2. 변경되었으면 새로운 fileIds 배열 (빈 배열이면 모든 파일 삭제)
                      const fileIdsToSend = isFileIdsChanged ? validFileIds : undefined;
                      
                      console.log('[LentHistoryPage] 리뷰 수정 요청:', {
                        reviewId: myReview.reviewId,
                        fileIds: fileIdsToSend,
                        fileIdsLength: fileIdsToSend?.length || 0,
                        originalFileIds: originalReviewFileIds,
                        currentFileIds: validFileIds,
                        isFileIdsChanged: isFileIdsChanged
                      });
                      
                      const updateData = {
                        reviewId: myReview.reviewId,
                        title: reviewTitle.trim() || `리뷰`,
                        content: reviewContent.trim(),
                        rating: reviewRating
                      };
                      
                      // fileIds가 변경된 경우에만 포함
                      if (isFileIdsChanged) {
                        updateData.fileIds = fileIdsToSend;
                      }
                      
                      await updateReview(updateData);
                      
                      setAlertMessage('리뷰가 수정되었습니다.');
                      setAlertType('success');
                      setShowEditReviewModal(false);
                      setReviewTitle('');
                      setReviewContent('');
                      setReviewRating(0);
                      setReviewFileIds([]);
                      setReviewImagePreviews([]);
                      setOriginalReviewFileIds([]);
                      // 리뷰 다시 불러오기
                      await loadReviews();
                    } catch (error) {
                      console.error('리뷰 수정 실패:', error);
                      setAlertMessage('리뷰 수정에 실패했습니다. 다시 시도해주세요.');
                      setAlertType('error');
                    }
                  }}
                  disabled={isUpdatingReview}
                  className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdatingReview ? '수정 중...' : '수정하기'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default LentHistoryPage;

