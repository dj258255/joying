/**
 * ShippingMessageCard Component
 * 발송 완료 메시지 카드 컴포넌트
 */

import React, { useState } from 'react';
import { TrackingStatusCard } from '../../shipping';
import Modal from '@/shared/components/Modal';

/**
 * 발송 메시지 내용 파싱
 * @param {string} content - 메시지 내용
 * @returns {Object|null} 파싱된 발송 정보
 */
export const parseShippingMessage = (content) => {
  if (!content) return null;

  // "물품을 발송했습니다!" 메시지 형식 감지
  if (!content.includes('물품을 발송했습니다')) {
    return null;
  }

  // 택배사 추출
  const courierMatch = content.match(/택배사[:\s]+([^\n]+)/i);
  // 운송장 번호 추출
  const trackingMatch = content.match(/운송장 번호[:\s]+([^\n]+)/i);
  // rentalHisId 추출
  const rentalHisIdMatch = content.match(/rentalHisId[:\s]*(\d+)/i);

  if (!courierMatch || !trackingMatch) {
    return null;
  }

  const courier = courierMatch[1].trim().toLowerCase();
  const trackingNumber = trackingMatch[1].trim();
  const rentalHisId = rentalHisIdMatch ? Number(rentalHisIdMatch[1]) : null;

  return {
    courier,
    trackingNumber,
    rentalHisId
  };
};

/**
 * 발송 메시지 카드 컴포넌트
 */
const ShippingMessageCard = ({ message, isOwn = false, onTrackClick }) => {
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [trackingData, setTrackingData] = useState(null);
  const [isLoadingTracking, setIsLoadingTracking] = useState(false);
  
  const shippingInfo = parseShippingMessage(message.content);

  if (!shippingInfo) {
    // 발송 메시지가 아니면 null 반환 (기본 MessageBubble로 렌더링)
    return null;
  }

  // 배송 조회 버튼 클릭 핸들러
  const handleTrackClick = async () => {
    if (onTrackClick && shippingInfo.rentalHisId) {
      // rentalHisId가 있으면 백엔드 API 호출
      try {
        setIsLoadingTracking(true);
        await onTrackClick(shippingInfo.rentalHisId);
      } catch (error) {
        console.error('[ShippingMessageCard] 배송 조회 실패:', error);
      } finally {
        setIsLoadingTracking(false);
      }
    } else {
      // rentalHisId가 없으면 채팅 메시지에서 파싱한 값 사용
      setShowTrackingModal(true);
    }
  };

  const courierMap = {
    cj: 'CJ대한통운',
    post: '우체국택배',
    lotte: '롯데택배',
    hanjin: '한진택배',
    logen: '로젠택배',
    'cj대한통운': 'CJ대한통운',
    'cj 대한통운': 'CJ대한통운',
    '우체국택배': '우체국택배',
    '롯데택배': '롯데택배',
    '한진택배': '한진택배',
    '로젠택배': '로젠택배'
  };

  const courierName = courierMap[shippingInfo.courier] || shippingInfo.courier;

  return (
    <>
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2 px-4`}>
        <div className={`max-w-[80%] ${isOwn ? 'order-2' : 'order-1'}`}>
          {/* 발송 완료 카드 */}
          <div className={`bg-white/90 backdrop-blur-sm border border-gray-200/60 rounded-xl shadow-md overflow-hidden ${
            isOwn ? 'rounded-tr-sm' : 'rounded-tl-sm'
          }`}>
            {/* 헤더 */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white px-4 py-3 border-b border-gray-900/20">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="font-bold text-sm">물품을 발송했습니다</p>
              </div>
            </div>

            {/* 정보 */}
            <div className="p-4 space-y-3 bg-white/80">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 font-medium w-16 flex-shrink-0">택배사</span>
                    <span className="text-sm text-gray-900 font-semibold">{courierName}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 font-medium w-16 flex-shrink-0">운송장 번호</span>
                    <span className="text-sm text-gray-900 font-mono font-semibold break-all">{shippingInfo.trackingNumber}</span>
                  </div>
                </div>
              </div>

              {/* 배송 조회 버튼 */}
              <button
                onClick={handleTrackClick}
                disabled={isLoadingTracking}
                className="glass-button w-full text-sm mt-4 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>{isLoadingTracking ? '조회 중...' : '배송 조회'}</span>
                </div>
              </button>
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

      {/* 배송 조회 모달 */}
      {showTrackingModal && (
        <Modal
          isOpen={showTrackingModal}
          onClose={() => setShowTrackingModal(false)}
          className="max-w-sm md:max-w-2xl lg:max-w-4xl"
        >
          <TrackingStatusCard
            trackingNumber={shippingInfo.trackingNumber}
            courier={shippingInfo.courier}
          />
        </Modal>
      )}
    </>
  );
};

export default ShippingMessageCard;

