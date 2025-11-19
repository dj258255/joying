/**
 * TransactionCreateModal Component
 * 거래 생성 모달 (요금, 보증금, 비디오 촬영 여부 입력)
 */

import React, { useState, useEffect } from 'react';
import Modal from '../../../shared/components/Modal/Modal';

const TransactionCreateModal = ({ 
  isOpen, 
  onClose, 
  rentalInfo,
  onSubmit, 
  isLoading = false 
}) => {
  const {
    productTitle,
    startDate,
    endDate,
    days,
    dailyPrice,
    deposit,
    requesterName
  } = rentalInfo || {};

  // 폼 상태
  const [rentalFee, setRentalFee] = useState(dailyPrice || '');
  const [depositAmount, setDepositAmount] = useState(deposit || '');
  const [requireVideo, setRequireVideo] = useState(false);
  const [error, setError] = useState('');

  // rentalInfo가 변경될 때마다 기본값 업데이트
  useEffect(() => {
    setRentalFee(dailyPrice || '');
    setDepositAmount(deposit || '');
  }, [dailyPrice, deposit]);

  const formatDate = (date) => {
    if (!date) return '';
    const dateObj = date instanceof Date ? date : new Date(date);
    
    if (isNaN(dateObj.getTime())) {
      return date;
    }
    
    return dateObj.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleClose = () => {
    setError('');
    onClose();
  };

  const handleSubmit = async () => {
    // 유효성 검사
    const rentalFeeNum = Number(rentalFee) || 0;
    const depositAmountNum = Number(depositAmount) || 0;
    
    if (rentalFeeNum <= 0) {
      setError('일일 대여료를 입력해주세요.');
      return;
    }
    if (depositAmountNum < 0) {
      setError('보증금은 0원 이상이어야 합니다.');
      return;
    }

    try {
      await onSubmit({
        rentalFee: rentalFeeNum,
        depositAmount: depositAmountNum,
        requireVideo
      });
      handleClose();
    } catch (err) {
      setError(err.message || '거래 생성에 실패했습니다.');
    }
  };

  if (!rentalInfo) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="거래 생성">
      <div className="space-y-6 p-4">
        {/* 대여 정보 요약 */}
        <div className="bg-gray-50 p-3 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">대여 정보</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <div>상품: {productTitle}</div>
            <div>기간: {formatDate(startDate)} ~ {formatDate(endDate)} ({days}일)</div>
            {requesterName && <div>요청자: {requesterName}</div>}
          </div>
        </div>

        {/* 일일 대여료 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            일일 대여료 *
          </label>
          <div className="relative">
            <input
              type="number"
              value={rentalFee}
              onChange={(e) => {
                const value = e.target.value;
                setRentalFee(value === '' ? '' : Number(value));
                setError('');
              }}
              onBlur={(e) => {
                const value = Number(e.target.value);
                if (isNaN(value) || value < 0) {
                  setRentalFee('');
                }
              }}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="일일 대여료를 입력하세요"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">원</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            기본값: {dailyPrice?.toLocaleString()}원 (할인 가능)
          </p>
        </div>

        {/* 보증금 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            보증금 *
          </label>
          <div className="relative">
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => {
                const value = e.target.value;
                setDepositAmount(value === '' ? '' : Number(value));
                setError('');
              }}
              onBlur={(e) => {
                const value = Number(e.target.value);
                if (isNaN(value) || value < 0) {
                  setDepositAmount('');
                }
              }}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="보증금을 입력하세요"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">원</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            기본값: {deposit?.toLocaleString()}원
          </p>
        </div>

        {/* 비디오 촬영 여부 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            비디오 촬영 요구
          </label>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="requireVideo"
                checked={requireVideo === true}
                onChange={() => setRequireVideo(true)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm text-gray-700">필요</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="requireVideo"
                checked={requireVideo === false}
                onChange={() => setRequireVideo(false)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm text-gray-700">불필요</span>
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            발송/수령 시 비디오 촬영을 요구할 수 있습니다
          </p>
        </div>

        {/* 총 금액 계산 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">총 결제 금액</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-blue-800">
              <span>대여료 ({days}일)</span>
              <span className="font-medium">
                {rentalFee && Number(rentalFee) > 0 ? ((Number(rentalFee) * days).toLocaleString() + '원') : '-'}
              </span>
            </div>
            <div className="flex justify-between text-blue-800">
              <span>보증금</span>
              <span className="font-medium">
                {depositAmount && Number(depositAmount) > 0 ? (Number(depositAmount).toLocaleString() + '원') : '-'}
              </span>
            </div>
            <div className="border-t border-blue-300 pt-2 mt-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-blue-900">총계</span>
                <span className="text-xl font-bold text-blue-900">
                  {rentalFee && Number(rentalFee) > 0 && depositAmount && Number(depositAmount) >= 0
                    ? ((Number(rentalFee) * days + Number(depositAmount)).toLocaleString() + '원')
                    : '-'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* 버튼 */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isLoading ? '생성 중...' : '거래 생성하기'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default TransactionCreateModal;
