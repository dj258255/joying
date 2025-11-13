/**
 * CancelRequestModal Component
 * 거래 취소 신청 모달 컴포넌트
 * - 취소 사유 입력
 * - 보증금 분배 (구매자/판매자)
 */

import React, { useState, useEffect } from 'react';
import Modal from '../../../shared/components/Modal/Modal';

const CancelRequestModal = ({ isOpen, onClose, rentalData, onSubmit, isSubmitting }) => {
  const [cancelReason, setCancelReason] = useState('');
  const [buyerDeposit, setBuyerDeposit] = useState(0);
  const [sellerDeposit, setSellerDeposit] = useState(0);
  const [error, setError] = useState('');

  const totalDeposit = rentalData?.deposit || 0;

  // 모달이 열릴 때마다 초기화
  useEffect(() => {
    if (isOpen) {
      setCancelReason('');
      setBuyerDeposit(0);
      setSellerDeposit(0);
      setError('');
    }
  }, [isOpen]);

  // 보증금 분배 합계 검증
  useEffect(() => {
    const sum = Number(buyerDeposit) + Number(sellerDeposit);
    if (sum !== totalDeposit) {
      setError(`보증금 분배 합계(${sum.toLocaleString()}원)가 총 보증금(${totalDeposit.toLocaleString()}원)과 일치하지 않습니다.`);
    } else {
      setError('');
    }
  }, [buyerDeposit, sellerDeposit, totalDeposit]);

  const handleBuyerDepositChange = (e) => {
    const value = Number(e.target.value) || 0;
    setBuyerDeposit(value);
    setSellerDeposit(totalDeposit - value);
  };

  const handleSellerDepositChange = (e) => {
    const value = Number(e.target.value) || 0;
    setSellerDeposit(value);
    setBuyerDeposit(totalDeposit - value);
  };

  const handleSubmit = async () => {
    // 유효성 검증
    if (!cancelReason.trim()) {
      setError('취소 사유를 입력해주세요.');
      return;
    }

    const sum = Number(buyerDeposit) + Number(sellerDeposit);
    if (sum !== totalDeposit) {
      setError(`보증금 분배 합계가 총 보증금과 일치하지 않습니다.`);
      return;
    }

    try {
      await onSubmit({
        reason: cancelReason.trim(),
        buyerRefund: Number(buyerDeposit),
        sellerRefund: Number(sellerDeposit)
      });
    } catch (err) {
      console.error('[CancelRequestModal] 취소 신청 실패:', err);
      setError(err.response?.data?.message || err.message || '취소 신청에 실패했습니다.');
    }
  };

  const handleDistributeEvenly = () => {
    const half = Math.floor(totalDeposit / 2);
    setBuyerDeposit(half);
    setSellerDeposit(totalDeposit - half);
  };

  const handleAllToBuyer = () => {
    setBuyerDeposit(totalDeposit);
    setSellerDeposit(0);
  };

  const handleAllToSeller = () => {
    setBuyerDeposit(0);
    setSellerDeposit(totalDeposit);
  };

  // rentalData가 없으면 모달을 렌더링하지 않음
  if (!isOpen || !rentalData) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="거래 취소 신청">
      <div className="space-y-6">
        {/* 거래 정보 요약 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">거래 정보</h3>
          <div className="space-y-1 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>대여 기간:</span>
              <span className="font-medium">
                {rentalData.startRen ? new Date(rentalData.startRen).toLocaleDateString() : '-'} ~ {rentalData.endRen ? new Date(rentalData.endRen).toLocaleDateString() : '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>총 보증금:</span>
              <span className="font-bold text-blue-600">{totalDeposit.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between">
              <span>상태:</span>
              <span className="font-medium">{rentalData.status || '-'}</span>
            </div>
          </div>
        </div>

        {/* 취소 사유 입력 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            취소 사유 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="거래 취소 사유를 입력해주세요..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={4}
            maxLength={500}
          />
          <div className="text-xs text-gray-500 mt-1 text-right">
            {cancelReason.length} / 500자
          </div>
        </div>

        {/* 보증금 분배 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            보증금 분배 <span className="text-red-500">*</span>
          </label>

          {/* 빠른 분배 버튼 */}
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={handleDistributeEvenly}
              className="flex-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              반반 분배
            </button>
            <button
              type="button"
              onClick={handleAllToBuyer}
              className="flex-1 px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors"
            >
              구매자 전액
            </button>
            <button
              type="button"
              onClick={handleAllToSeller}
              className="flex-1 px-3 py-2 text-sm bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors"
            >
              판매자 전액
            </button>
          </div>

          {/* 구매자 보증금 */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              구매자가 가져갈 보증금
            </label>
            <div className="relative">
              <input
                type="number"
                value={buyerDeposit}
                onChange={handleBuyerDepositChange}
                min={0}
                max={totalDeposit}
                className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                원
              </span>
            </div>
          </div>

          {/* 판매자 보증금 */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              판매자가 가져갈 보증금
            </label>
            <div className="relative">
              <input
                type="number"
                value={sellerDeposit}
                onChange={handleSellerDepositChange}
                min={0}
                max={totalDeposit}
                className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                원
              </span>
            </div>
          </div>

          {/* 합계 확인 */}
          <div className={`flex items-center justify-between px-3 py-2 rounded-lg ${
            error ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
          }`}>
            <span className="text-sm font-medium text-gray-700">분배 합계:</span>
            <span className={`text-sm font-bold ${error ? 'text-red-600' : 'text-green-600'}`}>
              {(Number(buyerDeposit) + Number(sellerDeposit)).toLocaleString()}원
            </span>
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-red-600">{error}</span>
            </div>
          </div>
        )}

        {/* 안내 메시지 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="text-xs text-yellow-800">
              <div className="font-medium mb-1">취소 신청 안내</div>
              <ul className="list-disc list-inside space-y-1">
                <li>취소 신청 후 상대방의 승인이 필요합니다.</li>
                <li>보증금은 합의된 비율로 분배됩니다.</li>
                <li>취소가 승인되면 결제가 취소되고 환불이 진행됩니다.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !!error || !cancelReason.trim()}
            className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '신청 중...' : '취소 신청'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CancelRequestModal;
