/**
 * TrackingNumberRequestMessageCard Component
 * 운송장 번호 입력 요청 메시지 카드 컴포넌트
 */

import React, { useState } from 'react';

/**
 * 운송장 번호 입력 요청 메시지 내용 파싱
 * @param {string} content - 메시지 내용
 * @returns {Object|null} 파싱된 운송장 요청 정보
 */
export const parseTrackingNumberRequestMessage = (content) => {
  if (!content) return null;

  // "MESSAGE_TYPE:TRACKING_NUMBER_REQUEST" 메시지 형식 감지
  if (!content.includes('MESSAGE_TYPE:TRACKING_NUMBER_REQUEST')) {
    return null;
  }

  // rentalHisId 추출
  const rentalHisIdMatch = content.match(/rentalHisId[:\s]*(\d+)/i);
  const rentalHisId = rentalHisIdMatch ? Number(rentalHisIdMatch[1]) : null;

  if (!rentalHisId) {
    return null;
  }

  return {
    rentalHisId
  };
};

/**
 * 운송장 번호 입력 요청 메시지 카드 컴포넌트
 */
const TrackingNumberRequestMessageCard = ({ message, isOwn = false, isSeller = false, onShippingClick }) => {
  const trackingInfo = parseTrackingNumberRequestMessage(message.content);

  if (!trackingInfo) {
    // 운송장 요청 메시지가 아니면 null 반환 (기본 MessageBubble로 렌더링)
    return null;
  }

  const handleShippingClick = () => {
    if (onShippingClick && trackingInfo.rentalHisId) {
      onShippingClick(trackingInfo.rentalHisId);
    }
  };

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2 px-4`}>
      <div className={`max-w-[80%] ${isOwn ? 'order-2' : 'order-1'}`}>
        {/* 운송장 요청 카드 */}
        <div className={`bg-white/90 backdrop-blur-sm border border-gray-200/60 rounded-xl shadow-md overflow-hidden ${
          isOwn ? 'rounded-tr-sm' : 'rounded-tl-sm'
        }`}>
          {/* 헤더 */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-3 border-b border-blue-700/20">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="font-bold text-sm">물품 발송 요청</p>
            </div>
          </div>

          {/* 정보 */}
          <div className="p-4 space-y-3 bg-white/80">
            <div className="text-center py-2">
              <p className="text-sm text-gray-900 font-medium mb-1">
                {isSeller ? '물품 발송을 시작해주세요!' : '판매자가 물품을 발송할 예정입니다'}
              </p>
              <p className="text-xs text-gray-600">
                {isSeller
                  ? '택배사와 운송장 번호를 입력해주세요.'
                  : '판매자가 운송장 번호를 등록하면 알림을 드립니다.'}
              </p>
            </div>

            {/* 물품 보내기 버튼 - 판매자에게만 표시 */}
            {isSeller && trackingInfo.rentalHisId && onShippingClick && (
              <button
                onClick={handleShippingClick}
                className="glass-button w-full text-sm mt-4 py-2.5"
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <span>물품 보내기</span>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* 시간 표시 */}
        <div className={`text-xs text-gray-500 mt-1 px-1 ${isOwn ? 'text-right' : 'text-left'}`}>
          {new Date(message.timestamp || message.createdAt).toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>
    </div>
  );
};

export default TrackingNumberRequestMessageCard;
