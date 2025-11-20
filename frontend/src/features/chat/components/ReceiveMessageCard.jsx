/**
 * ReceiveMessageCard Component
 * 수령 확인 메시지 카드 컴포넌트
 */

import React, { useState, useEffect } from 'react';
import VideoListModal from '../../rental/components/VideoListModal';
import { checkButtonEnabled, TRANSACTION_STEPS } from '../../../shared/utils/transactionStepUtils';

/**
 * 수령 확인 메시지 내용 파싱
 * @param {string} content - 메시지 내용
 * @returns {Object|null} 파싱된 수령 확인 정보
 */
export const parseReceiveMessage = (content) => {
  if (!content) return null;

  // "물품을 수령했습니다" 메시지 형식 감지
  if (!content.includes('물품을 수령했습니다')) {
    return null;
  }

  // rentalHisId 추출
  const rentalHisIdMatch = content.match(/rentalHisId[:\s]*(\d+)/i);
  // 영상 URL 추출 (마크다운 링크 형식)
  const videoUrlMatch = content.match(/\[.*?\]\(([^)]+)\)/);

  const rentalHisId = rentalHisIdMatch ? Number(rentalHisIdMatch[1]) : null;
  const videoUrl = videoUrlMatch ? videoUrlMatch[1] : null;

  return {
    rentalHisId,
    videoUrl
  };
};

/**
 * 수령 확인 메시지 카드 컴포넌트
 */
const ReceiveMessageCard = ({ message, isOwn = false, isBuyer = false, rentalData = null, onExtendClick, onReturnClick, onCancelClick }) => {
  const [showVideoListModal, setShowVideoListModal] = useState(false);
  const [buttonStates, setButtonStates] = useState({
    extend: { enabled: true, reason: null },
    return: { enabled: true, reason: null },
    cancel: { enabled: true, reason: null }
  });
  const receiveInfo = parseReceiveMessage(message.content);

  // 버튼 활성화 여부 확인
  useEffect(() => {
    const checkButtons = async () => {
      if (!receiveInfo?.rentalHisId) {
        return;
      }

      try {
        // rentalData가 없으면 조회
        let currentRentalData = rentalData;
        if (!currentRentalData && receiveInfo.rentalHisId) {
          const { rentalApi } = await import('../../rental/api/rentalApi');
          const rentalResponse = await rentalApi.getRentalDetail(receiveInfo.rentalHisId);
          currentRentalData = rentalResponse.data || rentalResponse;
        }

        if (!currentRentalData) {
          return;
        }

        // 수령 완료 여부 확인 (RENTING 상태 이상)
        const receiveStatus = currentRentalData?.status || currentRentalData?.rentalStatus;
        const isReceiveCompleted = receiveStatus === 'RENTING' ||
                                   receiveStatus === 'RETURN_REQUESTED' ||
                                   receiveStatus === 'RETURNED' ||
                                   receiveStatus === 'COMPLETED' ||
                                   receiveStatus === 'DEPOSIT_RETURNED';

        // 거래 연장하기 버튼: 수령 완료 후 활성화
        const extendState = isReceiveCompleted
          ? { enabled: true }
          : { enabled: false, reason: '수령을 먼저 완료해주세요' };

        // 반납하기 버튼: 수령 완료 후, 반납 전에만 활성화
        const returnTrackingCompleted = !!(currentRentalData?.returnTrackingNo || currentRentalData?.returnTrackingNumber);
        const returnState = isReceiveCompleted && !returnTrackingCompleted
          ? { enabled: true }
          : { enabled: false, reason: returnTrackingCompleted ? '이미 반납이 완료되었습니다' : (isReceiveCompleted ? '반납을 진행해주세요' : '수령을 먼저 완료해주세요') };

        // 거래 중단하기 버튼: 항상 활성화 (취소는 언제든 가능)
        const cancelState = { enabled: true };

        setButtonStates({
          extend: extendState,
          return: returnState,
          cancel: cancelState
        });
      } catch (err) {
        console.error('[ReceiveMessageCard] 버튼 상태 확인 실패:', err);
      }
    };

    checkButtons();
  }, [receiveInfo?.rentalHisId, rentalData]);

  if (!receiveInfo) {
    // 수령 확인 메시지가 아니면 null 반환 (기본 MessageBubble로 렌더링)
    return null;
  }

  return (
    <>
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2 px-4`}>
      <div className={`max-w-[80%] ${isOwn ? 'order-2' : 'order-1'}`}>
        {/* 수령 확인 카드 */}
        <div className={`bg-white/90 backdrop-blur-sm border border-gray-200/60 rounded-xl shadow-md overflow-hidden ${
          isOwn ? 'rounded-tr-sm' : 'rounded-tl-sm'
        }`}>
          {/* 헤더 */}
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white px-4 py-3 border-b border-gray-900/20">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="font-bold text-sm">물품을 수령했습니다</p>
            </div>
          </div>

          {/* 정보 */}
          <div className="p-4 space-y-3 bg-white/80">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-gray-900 font-medium">수령이 확인되었습니다</p>
            </div>

            {/* 거래 영상 보기 버튼 */}
            {receiveInfo.rentalHisId && (
              <button
                onClick={() => setShowVideoListModal(true)}
                className="glass-button w-full text-sm mt-3 py-2.5"
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>거래 영상 보기</span>
                </div>
              </button>
            )}

            {/* 버튼들 (구매자만) */}
            {isBuyer && (
              <div className="flex flex-col gap-2 mt-4">
                {/* 거래 연장하기 버튼 */}
                {onExtendClick && (
                  <button
                    onClick={() => buttonStates.extend.enabled && onExtendClick(receiveInfo.rentalHisId)}
                    disabled={!buttonStates.extend.enabled}
                    title={buttonStates.extend.reason || ''}
                    className={`glass-button w-full text-sm py-2.5 ${
                      buttonStates.extend.enabled
                        ? 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700'
                        : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>거래 연장하기</span>
                    </div>
                  </button>
                )}

                {/* 반납하기 버튼 */}
                {onReturnClick && (
                  <button
                    onClick={() => buttonStates.return.enabled && onReturnClick(receiveInfo.rentalHisId)}
                    disabled={!buttonStates.return.enabled}
                    title={buttonStates.return.reason || ''}
                    className={`glass-button w-full text-sm py-2.5 ${
                      buttonStates.return.enabled
                        ? ''
                        : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <span>반납하기</span>
                    </div>
                  </button>
                )}

                {/* 거래 중단하기 버튼 */}
                {onCancelClick && (
                  <button
                    onClick={() => buttonStates.cancel.enabled && onCancelClick(receiveInfo.rentalHisId)}
                    disabled={!buttonStates.cancel.enabled}
                    title={buttonStates.cancel.reason || ''}
                    className={`glass-button w-full text-sm py-2.5 ${
                      buttonStates.cancel.enabled
                        ? 'bg-red-50 hover:bg-red-100 border-red-200 text-red-700'
                        : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span>거래 중단하기</span>
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

    {/* 거래 영상 조회 모달 */}
    {receiveInfo.rentalHisId && (
      <VideoListModal
        isOpen={showVideoListModal}
        onClose={() => setShowVideoListModal(false)}
        rentalHisId={receiveInfo.rentalHisId}
      />
    )}
    </>
  );
};

export default ReceiveMessageCard;

