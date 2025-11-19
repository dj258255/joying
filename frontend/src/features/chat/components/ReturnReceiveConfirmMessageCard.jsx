/**
 * ReturnReceiveConfirmMessageCard Component
 * 반납 수령 확인 메시지 카드 컴포넌트
 */

import React, { useState } from 'react';
import VideoListModal from '../../rental/components/VideoListModal';
import { rentalApi } from '../../rental/api/rentalApi';

/**
 * 반납 수령 확인 메시지 내용 파싱
 * @param {string} content - 메시지 내용
 * @returns {Object|null} 파싱된 반납 수령 확인 정보
 */
export const parseReturnReceiveConfirmMessage = (content) => {
  if (!content) return null;

  // "반납 수령 영상이 업로드되었습니다" 또는 MESSAGE_TYPE:RETURN_RECEIVE_CONFIRM 감지
  const hasMessageType = content.includes('MESSAGE_TYPE:RETURN_RECEIVE_CONFIRM') || content.includes('RETURN_RECEIVE_CONFIRM');
  const hasText = content.includes('반납 수령 영상이 업로드되었습니다') || content.includes('물품 상태를 확인하고 선택해주세요');
  
  if (!hasMessageType && !hasText) {
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
 * 반납 수령 확인 메시지 카드 컴포넌트
 */
const ReturnReceiveConfirmMessageCard = ({ 
  message, 
  isOwn = false, 
  isSeller = false,
  onConfirmComplete,
  onCancelRequest,
  sendMessage
}) => {
  const [showVideoListModal, setShowVideoListModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const confirmInfo = parseReturnReceiveConfirmMessage(message.content);

  // 최종 수령 확인 처리
  const handleConfirm = async () => {
    if (!confirmInfo?.rentalHisId) {
      alert('거래 정보를 찾을 수 없습니다.');
      return;
    }

    if (!window.confirm('반납품을 최종 확인하고 거래를 완료하시겠습니까?')) {
      return;
    }

    try {
      setIsLoading(true);
      
      console.log('[ReturnReceiveConfirmMessageCard] 최종 수령 확인 시작:', confirmInfo.rentalHisId);

      // 반납 수령 확인 API 호출
      await rentalApi.confirmReturnReceive(confirmInfo.rentalHisId);

      // 채팅방에 완료 메시지 전송
      if (sendMessage) {
        await sendMessage({
          type: 'TEXT',
          content: `✅ 반납 수령을 최종 확인했습니다!\n\n거래가 완료되었습니다. 정산이 진행됩니다.\n\nrentalHisId:${confirmInfo.rentalHisId}`
        });
      }

      alert('반납 수령이 확인되었습니다! 정산이 진행됩니다.');

      if (onConfirmComplete) {
        onConfirmComplete(confirmInfo.rentalHisId);
      }
    } catch (err) {
      console.error('[ReturnReceiveConfirmMessageCard] 최종 수령 확인 실패:', err);
      alert(err.response?.data?.message || err.message || '수령 확인에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 거래 중단 처리
  const handleCancel = async () => {
    if (!confirmInfo?.rentalHisId) {
      alert('거래 정보를 찾을 수 없습니다.');
      return;
    }

    try {
      setIsLoading(true);
      
      // rentalHisId로 거래 상세 조회
      const rentalResponse = await rentalApi.getRentalDetail(confirmInfo.rentalHisId);
      const rentalData = rentalResponse.data || rentalResponse;

      if (onCancelRequest) {
        onCancelRequest(rentalData);
      }
    } catch (err) {
      console.error('[ReturnReceiveConfirmMessageCard] 거래 정보 조회 실패:', err);
      alert('거래 정보를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!confirmInfo) {
    // 반납 수령 확인 메시지가 아니면 null 반환 (기본 MessageBubble로 렌더링)
    return null;
  }

  return (
    <>
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2 px-4`}>
        <div className={`max-w-[80%] ${isOwn ? 'order-2' : 'order-1'}`}>
          {/* 반납 수령 확인 카드 */}
          <div className={`bg-white/90 backdrop-blur-sm border border-gray-200/60 rounded-xl shadow-md overflow-hidden ${
            isOwn ? 'rounded-tr-sm' : 'rounded-tl-sm'
          }`}>
            {/* 헤더 */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white px-4 py-3 border-b border-gray-900/20">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="font-bold text-sm">반납 수령 영상이 업로드되었습니다</p>
              </div>
            </div>

            {/* 정보 */}
            <div className="p-4 space-y-3 bg-white/80">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-gray-900 font-medium">물품 상태를 확인하고 선택해주세요</p>
              </div>

              {/* 거래 영상 보기 버튼 */}
              {confirmInfo.rentalHisId && (
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

              {/* 버튼들 (판매자만) */}
              {isSeller && (
                <div className="flex flex-col gap-2 mt-4">
                  {/* 최종 수령 확인 버튼 */}
                  {onConfirmComplete && (
                    <button
                      onClick={handleConfirm}
                      disabled={isLoading}
                      className="glass-button w-full text-sm py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{isLoading ? '처리 중...' : '최종 수령 확인'}</span>
                      </div>
                    </button>
                  )}

                  {/* 거래 중단 버튼 */}
                  {onCancelRequest && (
                    <button
                      onClick={handleCancel}
                      disabled={isLoading}
                      className="glass-button w-full text-sm py-2.5 bg-red-50 hover:bg-red-100 border-red-200 text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span>거래 중단</span>
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
      {confirmInfo.rentalHisId && (
        <VideoListModal
          isOpen={showVideoListModal}
          onClose={() => setShowVideoListModal(false)}
          rentalHisId={confirmInfo.rentalHisId}
        />
      )}
    </>
  );
};

export default ReturnReceiveConfirmMessageCard;

