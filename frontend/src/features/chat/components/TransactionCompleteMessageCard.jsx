/**
 * TransactionCompleteMessageCard Component
 * 거래 완료 메시지 카드 컴포넌트
 */

import React from 'react';

/**
 * 거래 완료 메시지 내용 파싱
 * @param {string} content - 메시지 내용
 * @returns {Object|null} 파싱된 거래 완료 정보
 */
export const parseTransactionCompleteMessage = (content) => {
  if (!content) return null;

  // "반납 수령을 확인했습니다" 또는 "거래가 완료되었습니다" 메시지 형식 감지
  if (!content.includes('반납 수령을 확인했습니다') && !content.includes('거래가 완료되었습니다')) {
    return null;
  }

  // rentalHisId 추출
  const rentalHisIdMatch = content.match(/rentalHisId[:\s]*(\d+)/i);
  // 영상 URL 추출 (마크다운 링크 형식)
  const videoUrlMatch = content.match(/\[.*?\]\(([^)]+)\)/);

  const rentalHisId = rentalHisIdMatch ? Number(rentalHisIdMatch[1]) : null;
  const videoUrl = videoUrlMatch ? videoUrlMatch[1] : null;

  if (!rentalHisId) {
    return null;
  }

  return {
    rentalHisId,
    videoUrl
  };
};

/**
 * 거래 완료 메시지 카드 컴포넌트
 */
const TransactionCompleteMessageCard = ({ message, isOwn = false, isSeller = false, isBuyer = false, uploadType, onReviewClick }) => {
  const completeInfo = parseTransactionCompleteMessage(message.content);

  if (!completeInfo) {
    // 거래 완료 메시지가 아니면 null 반환 (기본 MessageBubble로 렌더링)
    return null;
  }

  // 리뷰 작성하기 버튼 클릭 핸들러
  const handleReviewClick = () => {
    if (onReviewClick) {
      // 상품의 uploadType을 그대로 전달 (BORROW 또는 RENT)
      onReviewClick(completeInfo.rentalHisId, uploadType || 'RENT');
    }
  };

  return (
    <>
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2 px-4`}>
      <div className={`max-w-[80%] ${isOwn ? 'order-2' : 'order-1'}`}>
        {/* 거래 완료 카드 */}
        <div className={`bg-white/90 backdrop-blur-sm border border-gray-200/60 rounded-xl shadow-md overflow-hidden ${
          isOwn ? 'rounded-tr-sm' : 'rounded-tl-sm'
        }`}>
          {/* 헤더 */}
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white px-4 py-3 border-b border-gray-900/20">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="font-bold text-sm">거래가 완료되었습니다</p>
            </div>
          </div>

          {/* 정보 */}
          <div className="p-4 space-y-3 bg-white/80">
            <div className="text-center py-2">
              <p className="text-sm text-gray-900 font-medium mb-1">
                반납 수령을 확인했습니다!
              </p>
              <p className="text-xs text-gray-600">
                거래가 완료되었습니다. 정산이 진행됩니다.
              </p>
            </div>

            {/* 리뷰 작성하기 버튼 */}
            <div className="mt-4">
              <button
                onClick={handleReviewClick}
                className="glass-button w-full text-sm py-2.5"
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  <span>리뷰 쓰기</span>
                </div>
              </button>
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
    </>
  );
};

export default TransactionCompleteMessageCard;

