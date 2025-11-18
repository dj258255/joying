/**
 * RentalRequestMessageCard Component
 * 대여 요청 메시지 카드 컴포넌트
 */

import React from 'react';
import { useProductDetail } from '../../../features/product/hooks/useProductDetail';

/**
 * 대여 요청 메시지 내용 파싱
 * @param {string} content - 메시지 내용
 * @returns {Object|null} 파싱된 대여 요청 정보
 */
export const parseRentalRequestMessage = (content) => {
  if (!content) return null;

  // "대여를 요청했습니다" 메시지 형식 감지
  if (!content.includes('대여를 요청했습니다') && !content.includes('대여 요청')) {
    return null;
  }

  // JSON 형식인지 확인
  try {
    const parsed = JSON.parse(content);
    if (parsed.type === 'RENTAL_REQUEST' || parsed.productId) {
      return parsed;
    }
  } catch (e) {
    // JSON이 아니면 텍스트 파싱
  }

  // 상품명 추출
  const productMatch = content.match(/상품[:\s]+([^\n]+)/i);
  // 날짜 추출
  const dateMatch = content.match(/날짜[:\s]+([^\n]+)/i);
  // productId 추출
  const productIdMatch = content.match(/productId[:\s]*(\d+)/i);

  if (!productMatch || !dateMatch) {
    return null;
  }

  const productTitle = productMatch[1].trim();
  const dateRange = dateMatch[1].trim();
  const productId = productIdMatch ? Number(productIdMatch[1]) : null;

  return {
    productTitle,
    dateRange,
    productId
  };
};

/**
 * 대여 요청 메시지 카드 컴포넌트
 * @param {Object} props
 * @param {Object} props.message - 메시지 객체
 * @param {boolean} props.isOwn - 자신의 메시지 여부
 * @param {boolean} props.isRequester - 요청자 여부
 * @param {boolean} props.isSeller - 판매자 여부
 * @param {number|string} props.productId - 상품 ID (선택)
 * @param {Function} props.onRentalRequestAgain - 대여 다시 요청하기 핸들러
 * @param {Function} props.onCreateTransaction - 거래 생성하기 핸들러
 */
const RentalRequestMessageCard = ({ 
  message, 
  isOwn = false, 
  isRequester = false, 
  isSeller = false,
  productId: productIdProp = null,
  onRentalRequestAgain,
  onCreateTransaction
}) => {
  // 메시지에서 대여 정보 추출 (rentalInfo 객체 또는 content 파싱)
  let rentalInfoFromMessage = null;

  // rentalInfo 객체가 있는 경우 (JSON 형식 메시지)
  if (message.rentalInfo) {
    rentalInfoFromMessage = message.rentalInfo;
  } 
  // content가 JSON 문자열인 경우 파싱
  else if (message.content) {
    try {
      const parsed = JSON.parse(message.content);
      if (parsed.type === 'RENTAL_REQUEST' || parsed.productTitle || parsed.productId) {
        rentalInfoFromMessage = parsed;
      }
    } catch (e) {
      // JSON이 아니면 텍스트 파싱
    }
  }

  // 텍스트 파싱 (fallback)
  const rentalInfo = rentalInfoFromMessage || parseRentalRequestMessage(message.content);

  if (!rentalInfo) {
    // 대여 요청 메시지가 아니면 null 반환 (기본 MessageBubble로 렌더링)
    return null;
  }

  // productId 추출 (우선순위: prop > message.productId > rentalInfo > message.rentalInfo)
  const productId = productIdProp 
    || message.productId 
    || rentalInfo.productId 
    || rentalInfoFromMessage?.productId 
    || message.rentalInfo?.productId
    || null;

  // 상품 정보 조회 (productId가 있는 경우)
  const { product: productData } = useProductDetail(productId);
  
  // 상품 이미지 URL 결정 (우선순위: rentalInfo > productData > null)
  // API 응답 구조: productData.files[0].url 또는 productData.images[0] (정규화된 경우)
  const productImageUrl = rentalInfo.productImageUrl 
    || rentalInfoFromMessage?.productImageUrl 
    || message.rentalInfo?.productImageUrl
    || (productData?.files && Array.isArray(productData.files) && productData.files.length > 0 
        ? (productData.files[0]?.url || productData.files[0]?.fileUrl || productData.files[0]?.path)
        : null)
    || productData?.imageUrl 
    || (productData?.images && Array.isArray(productData.images) && productData.images.length > 0 
        ? productData.images[0]
        : null)
    || productData?.mainImageUrl
    || null;

  // 날짜 범위에서 일수 계산
  let days = 0;
  if (rentalInfo.dateRange) {
    const dateMatch = rentalInfo.dateRange.match(/([0-9.\s년월일]+)\s*~\s*([0-9.\s년월일]+)/);
    if (dateMatch) {
      const parseKoreanDate = (dateStr) => {
        if (!dateStr) return null;
        // "2025년 11월 12일" 형식
        let match = dateStr.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
        if (match) return new Date(+match[1], +match[2] - 1, +match[3]);
        // "2025. 11. 12." 또는 "2025.11.12" 형식
        match = dateStr.match(/(\d{4})[.\s]*(\d{1,2})[.\s]*(\d{1,2})/);
        if (match) return new Date(+match[1], +match[2] - 1, +match[3]);
        // "2025-11-12" 형식 (ISO fallback)
        match = dateStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (match) return new Date(+match[1], +match[2] - 1, +match[3]);
        return null;
      };
      const startDate = parseKoreanDate(dateMatch[1]);
      const endDate = parseKoreanDate(dateMatch[2]);
      if (startDate && endDate) {
        days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
      }
    }
  }

  // 금액 정보 추출 (우선순위: rentalInfo > productData)
  const dailyPrice = rentalInfo.dailyPrice 
    || rentalInfoFromMessage?.dailyPrice 
    || message.rentalInfo?.dailyPrice
    || productData?.price
    || productData?.rentalFee
    || productData?.dailyPrice
    || 0;
  
  const deposit = rentalInfo.deposit 
    || rentalInfoFromMessage?.deposit 
    || message.rentalInfo?.deposit
    || productData?.deposit
    || 0;

  const totalPrice = rentalInfo.totalPrice 
    || rentalInfoFromMessage?.totalPrice 
    || message.rentalInfo?.totalPrice
    || (dailyPrice > 0 && days > 0 ? dailyPrice * days + deposit : 0);

  // 한글 날짜를 Date 객체로 변환하는 함수
  const parseKoreanDate = (dateStr) => {
    if (!dateStr) return null;

    // "2025년 11월 12일" 형식
    let match = dateStr.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
    if (match) return new Date(+match[1], +match[2] - 1, +match[3]);

    // "2025. 11. 12." 또는 "2025.11.12" 형식
    match = dateStr.match(/(\d{4})[.\s]*(\d{1,2})[.\s]*(\d{1,2})/);
    if (match) return new Date(+match[1], +match[2] - 1, +match[3]);

    // "2025-11-12" 형식 (ISO fallback)
    match = dateStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (match) return new Date(+match[1], +match[2] - 1, +match[3]);

    return null;
  };

  const handleCreateTransaction = async () => {
    if (!onCreateTransaction) return;

    // 날짜 정보 추출
    const dateMatch = rentalInfo.dateRange.match(/([0-9.\s년월일]+)\s*~\s*([0-9.\s년월일]+)/);
    if (!dateMatch) {
      alert('대여 기간 정보를 찾을 수 없습니다.');
      return;
    }

    const startDate = parseKoreanDate(dateMatch[1]);
    const endDate = parseKoreanDate(dateMatch[2]);

    if (!startDate || !endDate) {
      alert('날짜 형식을 파싱할 수 없습니다.');
      return;
    }

    // 거래 방법은 BOTH로 고정 (UI에서 제거했으므로)
    const rentMethod = 'BOTH';

    await onCreateTransaction({
      startDate,
      endDate,
      rentMethod,
      rentalFee: dailyPrice,
      deposit: deposit
    });
  };

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2 px-4`}>
      <div className={`max-w-[80%] ${isOwn ? 'order-2' : 'order-1'}`}>
        {/* 대여 요청 카드 */}
        <div className={`bg-white/90 backdrop-blur-sm border border-gray-200/60 rounded-xl shadow-md overflow-hidden ${
          isOwn ? 'rounded-tr-sm' : 'rounded-tl-sm'
        }`}>
          {/* 헤더 */}
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white px-4 py-3 border-b border-gray-900/20">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="font-bold text-sm">대여를 요청했습니다</p>
            </div>
          </div>

          {/* 정보 */}
          <div className="p-4 space-y-3 bg-white/80">
            <div className="space-y-2.5">
              {/* 상품 이미지 및 상품명 */}
              <div className="flex items-start gap-3">
                {/* 상품 대표 이미지 */}
                {productImageUrl && (
                  <img
                    src={productImageUrl}
                    alt={rentalInfo.productTitle || productData?.title || productData?.name || '상품'}
                    className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-gray-500 font-medium block mb-1">상품</span>
                  <span className="text-sm text-gray-900 font-semibold block">
                    {rentalInfo.productTitle || productData?.title || productData?.name || '상품'}
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xs text-gray-500 font-medium w-16 flex-shrink-0">날짜</span>
                <span className="text-sm text-gray-900 font-semibold flex-1">{rentalInfo.dateRange}</span>
              </div>
              
              {/* 대여 금액 표시 */}
              {(totalPrice > 0 || dailyPrice > 0 || deposit > 0) && (
                <div className="pt-2 border-t border-gray-200">
                  <div className="space-y-1.5">
                    {dailyPrice > 0 && days > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">일일 대여료</span>
                        <span className="text-gray-900 font-medium">{dailyPrice.toLocaleString()}원 × {days}일</span>
                      </div>
                    )}
                    {deposit > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">보증금</span>
                        <span className="text-gray-900 font-medium">{deposit.toLocaleString()}원</span>
                      </div>
                    )}
                    {totalPrice > 0 && (
                      <div className="flex justify-between pt-1 border-t border-gray-200">
                        <span className="text-sm font-semibold text-gray-900">총 금액</span>
                        <span className="text-base font-bold text-gray-900">
                          {totalPrice.toLocaleString()}원
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 버튼 영역 */}
            {(isRequester || isSeller) && (
              <div className="pt-3 border-t border-gray-200 space-y-2">
                {/* 요청자에게는 '대여 다시 요청하기' 버튼 */}
                {isRequester && onRentalRequestAgain && (
                  <button
                    onClick={onRentalRequestAgain}
                    className="glass-button-ghost w-full text-sm py-2"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>대여 다시 요청하기</span>
                    </div>
                  </button>
                )}

                {/* 판매자에게는 '거래 생성하기' 버튼 */}
                {isSeller && onCreateTransaction && (
                  <button
                    onClick={handleCreateTransaction}
                    className="glass-button w-full text-sm py-2"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>거래 생성하기</span>
                    </div>
                  </button>
                )}
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

export default RentalRequestMessageCard;
