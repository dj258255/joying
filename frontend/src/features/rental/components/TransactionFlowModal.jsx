/**
 * TransactionFlowModal Component
 * 전체 거래 플로우를 보여주는 모달
 * - 현재 상태 표시
 * - 거래 진행 단계 시각화
 */

import React, { useState, useEffect } from 'react';
import Modal from '../../../shared/components/Modal/Modal';
import { rentalApi } from '../api/rentalApi';

/**
 * 거래 상태별 정보
 */
const TRANSACTION_STATUS_INFO = {
  PENDING: {
    label: '결제 대기',
    description: '대여자의 결제를 기다리는 중입니다',
    icon: '⏳',
    color: 'yellow'
  },
  RESERVED: {
    label: '결제 대기',
    description: '대여자의 결제를 기다리는 중입니다',
    icon: '⏳',
    color: 'yellow'
  },
  PAYMENT_PENDING: {
    label: '결제 대기',
    description: '대여자의 결제를 기다리는 중입니다',
    icon: '⏳',
    color: 'yellow'
  },
  ESCROW: {
    label: '결제 완료',
    description: '결제가 완료되어 에스크로에 보관 중입니다',
    icon: '💳',
    color: 'blue'
  },
  PAYMENT_COMPLETED: {
    label: '결제 완료',
    description: '결제가 완료되었습니다',
    icon: '✅',
    color: 'green'
  },
  SHIPPED: {
    label: '발송 완료',
    description: '물건이 발송되었습니다',
    icon: '🚚',
    color: 'blue'
  },
  DELIVERED: {
    label: '배송 완료',
    description: '물건이 배송되었습니다',
    icon: '📦',
    color: 'purple'
  },
  RENTING: {
    label: '대여 중',
    description: '현재 대여 중입니다',
    icon: '📱',
    color: 'indigo'
  },
  RETURN_REQUESTED: {
    label: '반납 신청',
    description: '반납이 신청되었습니다',
    icon: '📤',
    color: 'orange'
  },
  RETURN_SHIPPED: {
    label: '반납 배송 중',
    description: '반납 물건이 배송 중입니다',
    icon: '📬',
    color: 'orange'
  },
  COMPLETED: {
    label: '거래 완료',
    description: '거래가 완료되었습니다',
    icon: '🎉',
    color: 'green'
  },
  CANCELLED: {
    label: '거래 취소',
    description: '거래가 취소되었습니다',
    icon: '❌',
    color: 'red'
  }
};

/**
 * @param {Object} props
 * @param {boolean} props.isOpen - 모달 열림 상태
 * @param {Function} props.onClose - 모달 닫기 핸들러
 * @param {number} props.rentalHisId - 대여 이력 ID
 * @param {Object} props.rentalData - 대여 거래 정보 (선택적)
 * @param {Object} props.productData - 상품 정보 (선택적)
 */
const TransactionFlowModal = ({ isOpen, onClose, rentalHisId, rentalData: initialRentalData, productData }) => {
  const [rentalData, setRentalData] = useState(initialRentalData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // 거래 데이터 조회
  useEffect(() => {
    const loadRentalData = async () => {
      if (!isOpen || !rentalHisId) return;

      try {
        setIsLoading(true);
        setError(null);

        console.log('[TransactionFlowModal] 거래 데이터 조회 시작:', rentalHisId);

        const response = await rentalApi.getRentalDetail(rentalHisId);
        const data = response?.data || response?.body || response;
        
        console.log('[TransactionFlowModal] 거래 데이터 로드 성공:', data);
        setRentalData(data);
      } catch (err) {
        console.error('[TransactionFlowModal] 거래 데이터 조회 실패:', err);
        setError(err.response?.data?.message || err.message || '거래 정보를 불러올 수 없습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    if (initialRentalData) {
      setRentalData(initialRentalData);
    } else {
      loadRentalData();
    }
  }, [isOpen, rentalHisId, initialRentalData]);

  // 거래 단계 순서
  const transactionSteps = [
    { status: 'PENDING', label: '거래 생성', description: '거래가 생성되었습니다' },
    { status: 'PAYMENT_COMPLETED', label: '결제 완료', description: '결제가 완료되었습니다' },
    { status: 'SHIPPED', label: '발송 완료', description: '물건이 발송되었습니다' },
    { status: 'DELIVERED', label: '배송 완료', description: '물건이 배송되었습니다' },
    { status: 'RENTING', label: '대여 중', description: '현재 대여 중입니다' },
    { status: 'RETURN_SHIPPED', label: '반납 배송', description: '반납 물건이 배송 중입니다' },
    { status: 'COMPLETED', label: '거래 완료', description: '거래가 완료되었습니다' }
  ];

  // 현재 상태
  const currentStatus = rentalData?.status || rentalData?.rentalStatus || 'PENDING';
  const statusInfo = TRANSACTION_STATUS_INFO[currentStatus] || TRANSACTION_STATUS_INFO.PENDING;

  // 현재 단계 인덱스
  const currentStepIndex = transactionSteps.findIndex(step => step.status === currentStatus);
  const activeStepIndex = currentStepIndex >= 0 ? currentStepIndex : 0;

  // 날짜 포맷팅
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen || !rentalData) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="거래 진행 상황" 
      className="max-w-3xl"
      hideCloseButton={true}
    >
      <div className="space-y-6">
        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-500/20 backdrop-blur-xl border border-red-400/50 rounded-3xl p-6 shadow-lg">
            <p className="text-base text-red-900 font-semibold">{error}</p>
          </div>
        )}

        {/* 로딩 중 */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-14 w-14 border-b-3 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-900 font-semibold text-base">거래 정보를 불러오는 중...</p>
            </div>
          </div>
        )}

        {/* 거래 정보 요약 */}
        {!isLoading && rentalData && (
          <>
            <div className="p-6 bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl shadow-lg">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">거래 정보</h3>
                  {productData && (
                    <p className="text-base text-gray-700 font-semibold">{productData.title || productData.name}</p>
                  )}
                </div>
                <div className="text-right">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl ${
                    currentStatus === 'COMPLETED' ? 'bg-green-500/20 border border-green-400/50' :
                    currentStatus === 'CANCELLED' ? 'bg-red-500/20 border border-red-400/50' :
                    'bg-blue-500/20 border border-blue-400/50'
                  }`}>
                    <span className="text-2xl">{statusInfo.icon}</span>
                    <span className="text-base font-bold text-gray-900">{statusInfo.label}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/30">
                <div>
                  <p className="text-sm text-gray-600 mb-1">대여 기간</p>
                  <p className="text-base font-semibold text-gray-900">
                    {formatDate(rentalData.startRen)} ~ {formatDate(rentalData.endRen)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">총 금액</p>
                  <p className="text-base font-semibold text-gray-900">
                    {((rentalData.fee || 0) * (Math.ceil((new Date(rentalData.endRen) - new Date(rentalData.startRen)) / (1000 * 60 * 60 * 24)) + 1) + (rentalData.deposit || 0)).toLocaleString()}원
                  </p>
                </div>
              </div>
            </div>

            {/* 거래 단계 진행 상황 */}
            <div className="p-6 bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl shadow-lg">
              <h3 className="text-lg font-bold text-gray-900 mb-6">거래 진행 단계</h3>
              
              <div className="space-y-4">
                {transactionSteps.map((step, index) => {
                  const isCompleted = index <= activeStepIndex;
                  const isCurrent = index === activeStepIndex;
                  const stepStatusInfo = TRANSACTION_STATUS_INFO[step.status] || { icon: '○', color: 'gray' };

                  return (
                    <div key={step.status} className="flex items-start gap-4">
                      {/* 단계 아이콘 */}
                      <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-xl border-2 transition-all ${
                        isCompleted
                          ? isCurrent
                            ? 'bg-gray-900/80 border-gray-900 text-white shadow-lg'
                            : 'bg-green-500/20 border-green-400/50 text-green-900'
                          : 'bg-gray-100/50 border-gray-300/50 text-gray-400'
                      }`}>
                        {isCompleted && !isCurrent ? '✓' : stepStatusInfo.icon}
                      </div>

                      {/* 단계 정보 */}
                      <div className="flex-1">
                        <div className={`flex items-center justify-between mb-1 ${
                          isCompleted ? 'text-gray-900' : 'text-gray-400'
                        }`}>
                          <h4 className={`text-base font-bold ${isCurrent ? 'text-gray-900' : ''}`}>
                            {step.label}
                          </h4>
                          {isCurrent && (
                            <span className="px-3 py-1 bg-blue-500/20 border border-blue-400/50 rounded-full text-xs font-semibold text-blue-900">
                              진행 중
                            </span>
                          )}
                        </div>
                        <p className={`text-sm leading-relaxed ${
                          isCompleted ? 'text-gray-700' : 'text-gray-400'
                        }`}>
                          {step.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 운송장 정보 */}
            {(rentalData.trackingNumber || rentalData.returnTrackingNumber) && (
              <div className="p-6 bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl shadow-lg">
                <h3 className="text-lg font-bold text-gray-900 mb-4">배송 정보</h3>
                {rentalData.trackingNumber && (
                  <div className="mb-3">
                    <p className="text-sm text-gray-600 mb-1">발송 운송장</p>
                    <p className="text-base font-semibold text-gray-900">
                      {rentalData.carrierCode || rentalData.courier || '-'} {rentalData.trackingNumber}
                    </p>
                  </div>
                )}
                {rentalData.returnTrackingNumber && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">반납 운송장</p>
                    <p className="text-base font-semibold text-gray-900">
                      {rentalData.returnCourier || '-'} {rentalData.returnTrackingNumber}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 닫기 버튼 */}
            <button
              onClick={onClose}
              className="w-full px-6 py-3 glass-button text-white rounded-2xl font-semibold text-base"
            >
              닫기
            </button>
          </>
        )}
      </div>
    </Modal>
  );
};

export default TransactionFlowModal;

