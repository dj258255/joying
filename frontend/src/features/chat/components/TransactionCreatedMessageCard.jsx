/**
 * TransactionCreatedMessageCard Component
 * 거래 생성 완료 메시지 카드 컴포넌트
 */

import React from 'react';

/**
 * 거래 생성 완료 메시지 내용 파싱
 * @param {string} content - 메시지 내용
 * @returns {Object|null} 파싱된 거래 생성 정보
 */
export const parseTransactionCreatedMessage = (content) => {
  if (!content) return null;

  // "거래 생성 완료" 메시지 형식 감지
  if (!content.includes('거래 생성 완료')) {
    return null;
  }

  // 상품명 추출
  const productMatch = content.match(/상품[:\s]+([^\n]+)/i);
  // 기간 추출
  const periodMatch = content.match(/기간[:\s]+([^\n]+)/i);
  // 대여료 추출
  const rentalFeeMatch = content.match(/대여료[:\s]+([^\n]+)/i);
  // 보증금 추출
  const depositMatch = content.match(/보증금[:\s]+([^\n]+)/i);
  // 총 결제금액 추출
  const totalMatch = content.match(/총 결제금액[:\s]+([^\n]+)/i);
  // rentalHisId 추출
  const rentalHisIdMatch = content.match(/rentalHisId[:\s]*(\d+)/i);

  if (!productMatch || !periodMatch || !rentalFeeMatch || !depositMatch || !totalMatch) {
    return null;
  }

  const productTitle = productMatch[1].trim();
  const period = periodMatch[1].trim();
  const rentalFee = rentalFeeMatch[1].trim();
  const deposit = depositMatch[1].trim();
  const totalAmount = totalMatch[1].trim();
  const rentalHisId = rentalHisIdMatch ? Number(rentalHisIdMatch[1]) : null;

  return {
    productTitle,
    period,
    rentalFee,
    deposit,
    totalAmount,
    rentalHisId
  };
};

/**
 * 거래 생성 완료 메시지 카드 컴포넌트
 */
const TransactionCreatedMessageCard = ({ message, isOwn = false, onPaymentClick }) => {
  const transactionInfo = parseTransactionCreatedMessage(message.content);

  if (!transactionInfo) {
    // 거래 생성 완료 메시지가 아니면 null 반환 (기본 MessageBubble로 렌더링)
    return null;
  }

  const handlePaymentClick = () => {
    if (onPaymentClick && transactionInfo.rentalHisId) {
      onPaymentClick(transactionInfo.rentalHisId);
    }
  };

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2 px-4`}>
      <div className={`max-w-[80%] ${isOwn ? 'order-2' : 'order-1'}`}>
        {/* 거래 생성 완료 카드 */}
        <div className={`bg-white/90 backdrop-blur-sm border border-gray-200/60 rounded-xl shadow-md overflow-hidden ${
          isOwn ? 'rounded-tr-sm' : 'rounded-tl-sm'
        }`}>
          {/* 헤더 */}
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white px-4 py-3 border-b border-gray-900/20">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="font-bold text-sm">거래 생성 완료</p>
            </div>
          </div>

          {/* 정보 */}
          <div className="p-4 space-y-3 bg-white/80">
            <div className="space-y-2.5">
              <div className="flex items-start gap-3">
                <span className="text-xs text-gray-500 font-medium w-20 flex-shrink-0">상품</span>
                <span className="text-sm text-gray-900 font-semibold flex-1">{transactionInfo.productTitle}</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xs text-gray-500 font-medium w-20 flex-shrink-0">기간</span>
                <span className="text-sm text-gray-900 font-semibold flex-1">{transactionInfo.period}</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xs text-gray-500 font-medium w-20 flex-shrink-0">대여료</span>
                <span className="text-sm text-gray-900 font-semibold flex-1">{transactionInfo.rentalFee}</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xs text-gray-500 font-medium w-20 flex-shrink-0">보증금</span>
                <span className="text-sm text-gray-900 font-semibold flex-1">{transactionInfo.deposit}</span>
              </div>
              <div className="pt-2 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-medium">총 결제금액</span>
                  <span className="text-base text-gray-900 font-bold">{transactionInfo.totalAmount}</span>
                </div>
              </div>
            </div>

            {/* 결제하러 가기 버튼 */}
            {transactionInfo.rentalHisId && (
              <button
                onClick={handlePaymentClick}
                className="glass-button w-full text-sm mt-4 py-2.5"
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <span>결제하러 가기</span>
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

export default TransactionCreatedMessageCard;

