/**
 * RentalRequestCard Component
 * 대여 요청 카드 컴포넌트
 */

import React, { useState } from 'react';
import ProfileImage from '../../../shared/components/ProfileImage';
import TransactionCreateModal from './TransactionCreateModal';

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

  // 모달 상태
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatDate = (date) => {
    // 날짜가 문자열이면 Date 객체로 변환
    if (!date) return '';
    const dateObj = date instanceof Date ? date : new Date(date);
    
    // 유효하지 않은 날짜인 경우 처리
    if (isNaN(dateObj.getTime())) {
      return date; // 원본 문자열 반환
    }
    
    return dateObj.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-2xl p-3">
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-2">
        <ProfileImage 
          src={requesterProfile}
          alt={requesterName}
          size={32}
          className="w-8 h-8"
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm truncate">{requesterName}님이 대여를 요청했습니다</h3>
        </div>
      </div>

      {/* 상품 정보 */}
      <div className="bg-white rounded-lg p-2 mb-2">
        <div className="flex gap-2">
          <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
            {productImage ? (
              <img 
                src={productImage} 
                alt={productTitle}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 text-sm truncate mb-1">{productTitle}</h4>
            <p className="text-xs text-gray-600">
              {formatDate(startDate)} ~ {formatDate(endDate)}
            </p>
            <p className="text-xs text-gray-600">
              {days}일
            </p>
          </div>
        </div>
      </div>

      {/* 가격 정보 */}
      <div className="bg-white rounded-lg p-2 mb-2">
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">일일 대여료</span>
            <span className="font-medium">{dailyPrice?.toLocaleString()}원</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">보증금</span>
            <span className="font-medium">{deposit?.toLocaleString()}원</span>
          </div>
          <div className="border-t border-gray-200 pt-1 mt-1">
            <div className="flex justify-between">
              <span className="font-semibold text-gray-900 text-sm">총 금액</span>
              <span className="font-bold text-base text-blue-600">
                {totalPrice?.toLocaleString()}원
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowModal(true)}
          className="flex-1 py-2 px-3 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
        >
          거래 생성
        </button>
        <button
          onClick={onReject}
          className="flex-1 py-2 px-3 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors"
        >
          거절
        </button>
      </div>

      {/* 거래 생성 모달 */}
      <TransactionCreateModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        rentalInfo={rentalInfo}
        isLoading={isSubmitting}
        onSubmit={async (modifiedPricing) => {
          setIsSubmitting(true);
          try {
            await onAccept(modifiedPricing);
            setShowModal(false);
          } catch (err) {
            throw err;
          } finally {
            setIsSubmitting(false);
          }
        }}
      />
    </div>
  );
};

export default RentalRequestCard;
