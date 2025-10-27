/**
 * RentalRequestCard Component
 * 대여 요청 카드 컴포넌트
 */

import React from 'react';
import ProfileImage from '../../../shared/components/ProfileImage';

const RentalRequestCard = ({ rentalInfo, onAccept, onReject }) => {
  const {
    productTitle,
    productImage,
    startDate,
    endDate,
    days,
    dailyPrice,
    deposit,
    totalPrice,
    requesterName,
    requesterProfile
  } = rentalInfo;

  const formatDate = (date) => {
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-2xl p-4 mb-4">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-3">
        <ProfileImage 
          src={requesterProfile}
          alt={requesterName}
          size={40}
          className="w-10 h-10"
        />
        <div>
          <h3 className="font-semibold text-gray-900">{requesterName}님이 대여를 요청했습니다</h3>
          <p className="text-xs text-gray-500">방금 전</p>
        </div>
      </div>

      {/* 상품 정보 */}
      <div className="bg-white rounded-xl p-3 mb-3">
        <div className="flex gap-3">
          <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
            {productImage ? (
              <img 
                src={productImage} 
                alt={productTitle}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 truncate">{productTitle}</h4>
            <p className="text-sm text-gray-600">
              대여 기간: {formatDate(startDate)} ~ {formatDate(endDate)}
            </p>
            <p className="text-sm text-gray-600">
              대여 일수: {days}일
            </p>
          </div>
        </div>
      </div>

      {/* 가격 정보 */}
      <div className="bg-white rounded-xl p-3 mb-3">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">일일 대여료</span>
            <span className="font-medium">{dailyPrice?.toLocaleString()}원</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">대여 일수</span>
            <span className="font-medium">{days}일</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">보증금</span>
            <span className="font-medium">{deposit?.toLocaleString()}원</span>
          </div>
          <div className="border-t border-gray-200 pt-2">
            <div className="flex justify-between">
              <span className="font-semibold text-gray-900">총 금액</span>
              <span className="font-bold text-lg text-blue-600">
                {totalPrice?.toLocaleString()}원
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-2">
        <button
          onClick={onAccept}
          className="flex-1 py-2 px-4 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
        >
          승인
        </button>
        <button
          onClick={onReject}
          className="flex-1 py-2 px-4 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
        >
          거절
        </button>
      </div>
    </div>
  );
};

export default RentalRequestCard;
