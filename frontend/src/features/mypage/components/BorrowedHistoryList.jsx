/**
 * BorrowedHistoryList Component
 * 빌린 내역 목록 컴포넌트
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductCardByProductId from './ProductCardByProductId';
import ProfileImage from '../../../shared/components/ProfileImage';
import { useBorrowedHistory } from '@/features/rental/hooks/useRentalHistory';

/**
 * @param {Object} props
 * @param {Function} props.onProductClick - 상품 클릭 핸들러
 * @param {Function} props.onReviewClick - 리뷰 작성 핸들러
 */
const BorrowedHistoryList = ({ 
  onProductClick = () => {}, 
  onReviewClick = () => {}
}) => {
  const navigate = useNavigate();
  const [page] = useState(0);
  const [size] = useState(20);
  
  // API로 빌린 내역 조회
  const { data, isLoading, error } = useBorrowedHistory({ page, size });
  
  // 응답 데이터 구조: { content: [], pageable: {}, totalElements, ... }
  const displayHistory = data?.content || [];
  
  // 대여 기간 계산 함수 (시작일 + 종료일 + 사이 날짜)
  const calculateRentalDays = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1; // 시작일과 종료일 포함
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
      case 'COMPLETED': return '거래 완료'; // DEPOSIT_RETURNED와 동일 처리
      case 'CANCELLED': return '거래 취소';
      default: return '거래 대기';
    }
  };

  // 상태 색상
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

  // 캘린더 렌더링 함수
  const renderCalendar = (rental) => {
    const startDate = new Date(rental.startRen);
    const endDate = new Date(rental.endRen);
    const currentMonth = startDate.getMonth();
    const currentYear = startDate.getFullYear();
    
    // 해당 월의 첫째 날과 마지막 날
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    // 날짜 배열 생성
    const days = [];
    
    // 빈 날짜들 (이전 달)
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // 해당 월의 날짜들
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(currentYear, currentMonth, day);
      const isInRange = (currentDate >= startDate && currentDate <= endDate) || 
                       (currentDate.toDateString() === startDate.toDateString()) || 
                       (currentDate.toDateString() === endDate.toDateString());
      const isToday = currentDate.toDateString() === new Date().toDateString();
      
      days.push({
        day,
        isInRange,
        isToday,
        date: currentDate
      });
    }
    
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {currentYear}년 {currentMonth + 1}월
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
          {days.map((dateInfo, index) => {
            if (!dateInfo) {
              return <div key={index} className="h-8"></div>;
            }
            
            return (
              <div
                key={index}
                className={`h-8 flex items-center justify-center text-sm rounded-lg transition-all duration-200 ${
                  dateInfo.isInRange
                    ? 'bg-gray-900 text-white font-bold shadow-md'
                    : dateInfo.isToday
                    ? 'bg-gray-200 text-gray-800 font-semibold'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                }`}
              >
                {dateInfo.day}
              </div>
            );
          })}
        </div>
        
        {/* 범례 */}
        <div className="flex items-center justify-center gap-4 mt-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gray-900 rounded"></div>
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-500 mb-2">대여 내역을 불러오는데 실패했습니다.</div>
          <div className="text-sm text-gray-500">{error.message}</div>
        </div>
      </div>
    );
  }

  if (displayHistory.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="text-gray-500 mb-4">빌린 내역이 없습니다.</div>
          <button 
            onClick={() => navigate('/products')}
            className="bg-gradient-to-r from-gray-800 to-gray-900 text-white px-6 py-3 rounded-lg hover:from-gray-900 hover:to-black transition-all duration-200 font-medium shadow-lg"
          >
            상품 둘러보기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* 대여 내역 목록 */}
      <div className="space-y-4">
        {displayHistory.map((rental) => {
          const rentalDays = calculateRentalDays(rental.startRen, rental.endRen);
          const dailyPrice = rental.fee / rentalDays;
          
          return (
             <div 
               key={rental.rentalHisId}
               className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200 cursor-pointer"
               onClick={() => navigate(`/mypage/borrowed/${rental.rentalHisId}`)}
             >
               <div className="flex flex-col lg:flex-row gap-6">
                 {/* 상품 정보 */}
                <div className="lg:w-1/3 mt-3">
                   {/* 거래 상태 표시 - 상품 카드 위쪽 */}
                  <div className="mb-3">
                     <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(rental.status)}`}>
                       {getStatusText(rental.status)}
                     </span>
                   </div>
                   <ProductCardByProductId
                     productId={rental.product.productId}
                     status={
                       rental.status === 'DEPOSIT_RETURNED' || rental.status === 'COMPLETED' ? 'completed' :
                       rental.status === 'RENTING' ? 'rented' :
                       rental.status === 'CANCELLED' ? 'unavailable' :
                       rental.status === 'PENDING' || rental.status === 'ESCROW' ? 'pending' :
                       'available'
                     }
                   />
                 </div>

                {/* 대여 정보 */}
                <div className="lg:w-2/3 space-y-4">
                  {/* 빌려준 사람 정보 */}
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                    <ProfileImage 
                      src={rental.counterparty.profileImage}
                      alt={rental.counterparty.nickname || rental.counterparty.name || '상대방'}
                      size={50}
                      className="w-12 h-12"
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{(rental.counterparty.nickname || rental.counterparty.name || '알 수 없음')} 님에게 빌림</h4>
                      <p className="text-sm text-gray-600">거래 방식: {rental.rentMethod === 'ONLINE' ? '택배 거래' : '직거래'}</p>
                    </div>
                  </div>

                  {/* 대여 기간 캘린더 및 결제 정보 */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* 대여 기간 캘린더 */}
                    <div>
                      {renderCalendar(rental)}
                    </div>

                    {/* 결제 내역 */}
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <h5 className="font-semibold text-gray-900 mb-3">결제 내역</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-900">일일 대여료:</span>
                          <span className="font-medium text-gray-900">{Math.round(dailyPrice).toLocaleString()}원</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-900">대여 기간:</span>
                          <span className="font-medium text-gray-900">{rentalDays}일</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-900">대여료 합계:</span>
                          <span className="font-medium text-gray-900">{rental.fee.toLocaleString()}원</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-900">보증금:</span>
                          <span className="font-medium text-gray-900">{rental.deposit.toLocaleString()}원</span>
                        </div>
                        <hr className="my-2" />
                        <div className="flex justify-between font-bold text-lg text-gray-900">
                          <span>총 결제금액</span>
                          <span>{(rental.fee + rental.deposit).toLocaleString()}원</span>
                        </div>
                        {rental.extensionCount > 0 && (
                          <div className="flex justify-between text-xs text-blue-600 mt-2">
                            <span>연장 횟수:</span>
                            <span>{rental.extensionCount}회</span>
                          </div>
                        )}
                      </div>
                    </div>
                   </div>
                 </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BorrowedHistoryList;