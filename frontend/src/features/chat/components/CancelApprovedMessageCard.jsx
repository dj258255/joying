/**
 * CancelApprovedMessageCard Component
 * 거래 취소 승인 메시지 카드 컴포넌트
 */

import React from 'react';

/**
 * 거래 취소 승인 메시지 내용 파싱
 * @param {string} content - 메시지 내용
 * @returns {Object|null} 파싱된 거래 취소 승인 정보
 */
export const parseCancelApprovedMessage = (content) => {
  if (!content) return null;

  // "MESSAGE_TYPE:CANCEL_APPROVED" 메시지 형식 감지
  if (!content.includes('MESSAGE_TYPE:CANCEL_APPROVED')) {
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
 * 거래 취소 승인 메시지 카드 컴포넌트
 */
const CancelApprovedMessageCard = ({ message, isOwn = false }) => {
  const cancelInfo = parseCancelApprovedMessage(message.content);

  if (!cancelInfo) {
    // 거래 취소 승인 메시지가 아니면 null 반환 (기본 MessageBubble로 렌더링)
    return null;
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2 px-4`}>
      <div className={`max-w-[80%] ${isOwn ? 'order-2' : 'order-1'}`}>
        {/* 거래 취소 승인 카드 */}
        <div className={`bg-white/90 backdrop-blur-sm border border-gray-200/60 rounded-xl shadow-md overflow-hidden ${
          isOwn ? 'rounded-tr-sm' : 'rounded-tl-sm'
        }`}>
          {/* 헤더 */}
          <div className="bg-gradient-to-r from-orange-600 to-orange-500 text-white px-4 py-3 border-b border-orange-700/20">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="font-bold text-sm">거래 취소 승인</p>
            </div>
          </div>

          {/* 정보 */}
          <div className="p-4 space-y-3 bg-white/80">
            <div className="text-center py-2">
              <p className="text-sm text-gray-900 font-medium mb-1">
                ✅ 거래 취소가 승인되었습니다
              </p>
              <p className="text-xs text-gray-600">
                보증금이 합의된 대로 분배됩니다.
              </p>
            </div>
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

export default CancelApprovedMessageCard;
