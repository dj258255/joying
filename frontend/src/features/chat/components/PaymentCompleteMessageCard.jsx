/**
 * PaymentCompleteMessageCard Component
 * 결제 완료 메시지 카드 컴포넌트
 */

import React from 'react';

/**
 * 결제 완료 메시지 내용 파싱
 * @param {string} content - 메시지 내용
 * @returns {Object|null} 파싱된 결제 완료 정보
 */
export const parsePaymentCompleteMessage = (content) => {
  if (!content) return null;

  // "결제가 완료되었습니다" 메시지 형식 감지
  if (!content.includes('결제가 완료되었습니다') && !content.includes('MESSAGE_TYPE:PAYMENT_COMPLETE')) {
    return null;
  }

  // 상품명 추출
  const productMatch = content.match(/상품[:\s]+([^\n]+)/i);
  // 결제 금액 추출
  const amountMatch = content.match(/결제 금액[:\s]+([^\n]+)/i);
  // 주문번호 추출
  const orderIdMatch = content.match(/주문번호[:\s]+([^\n]+)/i);
  // rentalHisId 추출
  const rentalHisIdMatch = content.match(/rentalHisId[:\s]*(\d+)/i);

  if (!amountMatch || !orderIdMatch) {
    return null;
  }

  const productTitle = productMatch ? productMatch[1].trim() : null;
  const amount = amountMatch[1].trim();
  const orderId = orderIdMatch[1].trim();
  const rentalHisId = rentalHisIdMatch ? Number(rentalHisIdMatch[1]) : null;

  return {
    productTitle,
    amount,
    orderId,
    rentalHisId
  };
};

/**
 * 결제 완료 메시지 카드 컴포넌트
 * @param {Object} props
 * @param {Object} props.message - 메시지 객체
 * @param {boolean} props.isOwn - 자신의 메시지 여부
 * @param {boolean} props.isSeller - 판매자 여부
 * @param {Function} props.onShippingClick - 물품 보내기 핸들러
 */
const PaymentCompleteMessageCard = ({ 
  message, 
  isOwn = false, 
  isSeller = false,
  onShippingClick
}) => {
  const paymentInfo = parsePaymentCompleteMessage(message.content);

  if (!paymentInfo) {
    // 결제 완료 메시지가 아니면 null 반환 (기본 MessageBubble로 렌더링)
    return null;
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2 px-4`}>
      <div className={`max-w-[80%] ${isOwn ? 'order-2' : 'order-1'}`}>
        {/* 결제 완료 카드 */}
        <div className={`bg-white/90 backdrop-blur-sm border border-gray-200/60 rounded-xl shadow-md overflow-hidden ${
          isOwn ? 'rounded-tr-sm' : 'rounded-tl-sm'
        }`}>
          {/* 헤더 */}
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white px-4 py-3 border-b border-gray-900/20">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="font-bold text-sm">결제가 완료되었습니다</p>
            </div>
          </div>

          {/* 정보 */}
          <div className="p-4 space-y-4 bg-white/80">
            {/* 결제 정보 */}
            <div className="space-y-3.5">
              {paymentInfo.productTitle && (
                <div className="flex items-start gap-3 pb-2 border-b border-gray-100">
                  <span className="text-xs text-gray-500 font-medium w-20 flex-shrink-0">상품</span>
                  <span className="text-sm text-gray-900 font-semibold flex-1">{paymentInfo.productTitle}</span>
                </div>
              )}
              <div className="flex items-center gap-3 py-2">
                <span className="text-xs text-gray-500 font-medium w-20 flex-shrink-0">결제 금액</span>
                <span className="text-lg text-gray-900 font-bold flex-1">{paymentInfo.amount}</span>
              </div>
              <div className="flex items-start gap-3 pt-2 border-t border-gray-100">
                <span className="text-xs text-gray-500 font-medium w-20 flex-shrink-0">주문번호</span>
                <span className="text-sm text-gray-900 font-mono font-semibold flex-1 break-all leading-relaxed">{paymentInfo.orderId}</span>
              </div>
            </div>

            {/* 안내 메시지 */}
            <div className="pt-3 border-t border-gray-200">
              {isSeller ? (
                <div className="flex items-start gap-2.5 text-xs text-gray-700 bg-gray-50/80 backdrop-blur-sm rounded-lg p-3 border border-gray-200/50">
                  <svg className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="flex-1 leading-relaxed">물건을 발송해주세요</span>
                </div>
              ) : (
                <div className="flex items-start gap-2.5 text-xs text-gray-700 bg-gray-50/80 backdrop-blur-sm rounded-lg p-3 border border-gray-200/50">
                  <svg className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="flex-1 leading-relaxed">판매자가 물건을 발송할 때까지 기다려주세요</span>
                </div>
              )}
            </div>

            {/* 물품 보내기 버튼 (판매자에게만 표시) */}
            {isSeller && paymentInfo.rentalHisId && onShippingClick && (
              <div className="pt-2">
                <button
                  onClick={() => onShippingClick(paymentInfo.rentalHisId)}
                  className="glass-button w-full text-sm py-2.5"
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <span>물품 보내기</span>
                  </div>
                </button>
              </div>
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

export default PaymentCompleteMessageCard;

