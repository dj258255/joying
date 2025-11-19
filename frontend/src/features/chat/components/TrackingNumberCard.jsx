/**
 * TrackingNumberCard Component
 * 송장 번호 등록 메시지 카드 컴포넌트
 */

import React, { useState, useEffect } from 'react';
import Modal from '../../../shared/components/Modal/Modal';
import CourierSelect from '../../../shared/components/CourierSelect';
import { rentalApi } from '../../rental/api/rentalApi';

/**
 * 송장 번호 등록 메시지 내용 파싱
 * @param {string} content - 메시지 내용
 * @returns {Object|null} 파싱된 송장 번호 정보
 */
export const parseTrackingNumberMessage = (content) => {
  if (!content) return null;

  // "운송장 번호를 등록해주세요" 메시지 형식 감지
  if (!content.includes('운송장 번호를 등록해주세요') && !content.includes('송장 번호 등록')) {
    return null;
  }

  // rentalHisId 추출
  const rentalHisIdMatch = content.match(/rentalHisId[:\s]*(\d+)/i);
  // MESSAGE_TYPE 추출
  const messageTypeMatch = content.match(/MESSAGE_TYPE[:\s]*([^\n]+)/i);

  const rentalHisId = rentalHisIdMatch ? Number(rentalHisIdMatch[1]) : null;
  const messageType = messageTypeMatch ? messageTypeMatch[1].trim() : null;

  // TRACKING_NUMBER_REGISTRATION 또는 RETURN_TRACKING_NUMBER_REGISTRATION
  if (!messageType || !messageType.includes('TRACKING')) {
    return null;
  }

  const isReturn = messageType.includes('RETURN');

  return {
    rentalHisId,
    messageType,
    isReturn
  };
};

/**
 * 송장 번호 등록 메시지 카드 컴포넌트
 */
const TrackingNumberCard = ({ message, isOwn = false, rentalData = null, onShippingComplete, sendMessage }) => {
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [courier, setCourier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isTrackingRegistered, setIsTrackingRegistered] = useState(false);

  const trackingInfo = parseTrackingNumberMessage(message.content);

  // 운송장 번호 등록 여부 확인
  useEffect(() => {
    const checkTrackingStatus = async () => {
      if (!trackingInfo?.rentalHisId) {
        return;
      }

      try {
        // rentalData가 없으면 조회
        let currentRentalData = rentalData;
        if (!currentRentalData && trackingInfo.rentalHisId) {
          const rentalResponse = await rentalApi.getRentalDetail(trackingInfo.rentalHisId);
          currentRentalData = rentalResponse.data || rentalResponse;
        }

        if (!currentRentalData) {
          return;
        }

        // 운송장 번호 확인
        if (trackingInfo.isReturn) {
          // 반납 운송장 번호
          const returnTracking = currentRentalData?.returnTrackingNo || currentRentalData?.returnTrackingNumber;
          setIsTrackingRegistered(!!returnTracking);
        } else {
          // 발송 운송장 번호
          const outboundTracking = currentRentalData?.outboundTrackingNo || currentRentalData?.outboundTrackingNumber || currentRentalData?.trackingNo || currentRentalData?.trackingNumber;
          setIsTrackingRegistered(!!outboundTracking);
        }
      } catch (err) {
        
      }
    };

    checkTrackingStatus();
  }, [trackingInfo?.rentalHisId, rentalData, trackingInfo?.isReturn]);

  if (!trackingInfo) {
    // 송장 번호 등록 메시지가 아니면 null 반환 (기본 MessageBubble로 렌더링)
    return null;
  }

  // 소유자만 송장 번호 등록 가능 (메시지를 보낸 사람이 소유자)
  // 발송 전 영상 메시지는 소유자가 보내므로, isOwn이 true인 경우에만 카드 표시
  // 단, 카드는 항상 표시하되 모달에서 권한 체크는 API에서 수행

  // 송장 번호 등록 처리
  const handleTrackingSubmit = async () => {
    if (!courier || !trackingNumber) {
      setError('택배사와 운송장 번호를 입력해주세요.');
      return;
    }

    if (trackingNumber.length < 10) {
      setError('운송장 번호를 정확히 입력해주세요. (최소 10자리)');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // 반납인 경우 returnItem API, 발송인 경우 shipItem API 호출
      if (trackingInfo.isReturn) {
        await rentalApi.returnItem(trackingInfo.rentalHisId, {
          carrierCode: courier,
          trackingNo: trackingNumber
        });
        
      } else {
        await rentalApi.shipItem(trackingInfo.rentalHisId, {
          carrierCode: courier,
          trackingNo: trackingNumber
        });
        
      }

      // 채팅방에 완료 메시지 전송
      if (sendMessage) {
        const courierOptions = [
          { value: 'cj', label: 'CJ대한통운' },
          { value: 'post', label: '우체국택배' },
          { value: 'lotte', label: '롯데택배' },
          { value: 'hanjin', label: '한진택배' },
          { value: 'logen', label: '로젠택배' }
        ];
        
        const courierName = courierOptions.find(c => c.value === courier)?.label || courier;

        if (trackingInfo.isReturn) {
          const messageContent = `📦 반납을 완료했습니다!\n\n택배사: ${courierName}\n운송장 번호: ${trackingNumber}\n\n배송 조회를 통해 물건 위치를 확인할 수 있습니다.\n\nrentalHisId:${trackingInfo.rentalHisId}\nMESSAGE_TYPE:RETURN_COMPLETE`;
          await sendMessage({
            type: 'TEXT',
            content: messageContent
          });
          
        } else {
          const messageContent = `🚚 물건이 발송되었습니다!\n\n택배사: ${courierName}\n운송장 번호: ${trackingNumber}\n\n배송 조회를 통해 물건 위치를 확인할 수 있습니다.\n\nrentalHisId:${trackingInfo.rentalHisId}\nMESSAGE_TYPE:SHIPPING_COMPLETE`;
          await sendMessage({
            type: 'TEXT',
            content: messageContent
          });
          
        }
      }

      // 운송장 번호 등록 상태 업데이트 (먼저 업데이트)
      setIsTrackingRegistered(true);

      // 부모 컴포넌트에 완료 알림
      if (onShippingComplete) {
        onShippingComplete({
          rentalHisId: trackingInfo.rentalHisId,
          trackingNo: trackingNumber,
          courier: courier
        });
      }

      // 모달 닫기
      setShowTrackingModal(false);
      setCourier('');
      setTrackingNumber('');
    } catch (err) {
      
      // 에러 메시지 개선
      const actionType = trackingInfo.isReturn ? '반납' : '발송';
      let errorMessage = `${actionType} 처리에 실패했습니다.`;
      
      if (err.response?.status === 400) {
        errorMessage = err.response?.data?.message || `잘못된 요청입니다. 운송장 번호를 확인해주세요.`;
      } else if (err.response?.status === 404) {
        errorMessage = '거래 정보를 찾을 수 없습니다.';
      } else if (err.response?.status === 403) {
        errorMessage = `${actionType} 권한이 없습니다.`;
      } else if (err.response?.status === 500) {
        errorMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2 px-4`}>
        <div className={`max-w-[80%] ${isOwn ? 'order-2' : 'order-1'}`}>
          {/* 송장 번호 등록 카드 */}
          <div className={`bg-white/90 backdrop-blur-sm border border-gray-200/60 rounded-xl shadow-md overflow-hidden ${
            isOwn ? 'rounded-tr-sm' : 'rounded-tl-sm'
          }`}>
            {/* 헤더 */}
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-4 py-3 border-b border-blue-900/20">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="font-bold text-sm">운송장 번호 등록</p>
              </div>
            </div>

            {/* 정보 */}
            <div className="p-4 space-y-3 bg-white/80">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="text-sm text-gray-900 font-medium">운송장 번호를 등록해주세요</p>
              </div>

              {/* 운송장 번호 등록하기 버튼 */}
              {isTrackingRegistered ? (
                <div className="w-full text-sm mt-3 py-2.5 bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-50 rounded-xl text-center">
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>운송장 등록 완료</span>
                  </div>
                </div>
              ) : (
              <button
                onClick={() => setShowTrackingModal(true)}
                className="glass-button w-full text-sm mt-3 py-2.5"
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>운송장 등록</span>
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

      {/* 송장 번호 등록 모달 */}
      <Modal
        isOpen={showTrackingModal}
        onClose={() => {
          setShowTrackingModal(false);
          setError(null);
          setCourier('');
          setTrackingNumber('');
        }}
        title="운송장 번호 등록"
        className="max-w-md"
        hideCloseButton={true}
      >
        <div className="space-y-6">
          {/* 안내 메시지 */}
          <div className="p-6 bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl shadow-lg">
            <p className="text-base text-gray-900 font-semibold mb-2">✅ 영상 촬영 완료</p>
            <p className="text-sm text-gray-700 leading-relaxed">
              물건을 포장한 후 운송장 번호를 입력해주세요.
            </p>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="bg-red-500/20 backdrop-blur-xl border border-red-400/50 rounded-3xl p-6 shadow-lg">
              <p className="text-base text-red-900 font-semibold">{error}</p>
            </div>
          )}

          {/* 택배사 및 운송장 번호 입력 */}
          <CourierSelect
            courier={courier}
            onCourierChange={setCourier}
            trackingNumber={trackingNumber}
            onTrackingNumberChange={setTrackingNumber}
            type={trackingInfo.isReturn ? "return" : "outbound"}
          />

          {/* 버튼 */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowTrackingModal(false);
                setError(null);
                setCourier('');
                setTrackingNumber('');
              }}
              className="flex-1 px-4 py-3 glass-button-ghost text-gray-900 rounded-2xl font-semibold text-base"
            >
              취소
            </button>
            <button
              onClick={handleTrackingSubmit}
              disabled={isLoading || !courier || !trackingNumber}
              className="flex-1 px-4 py-3 glass-button text-white rounded-2xl font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '처리 중...' : '등록하기'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default TrackingNumberCard;

