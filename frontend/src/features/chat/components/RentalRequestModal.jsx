/**
 * RentalRequestModal Component
 * 대여 다시 요청하기 모달
 */

import React, { useState } from 'react';
import Modal from '../../../shared/components/Modal/Modal';
import DateRangeCalendar from '../../../features/checkout/components/DateRangeCalendar';

const RentalRequestModal = ({ isOpen, onClose, productData, unavailableDates = [], onSubmit, isLoading = false }) => {
  const [dateRange, setDateRange] = useState(null);
  const [rentMethod, setRentMethod] = useState('BOTH');
  const [error, setError] = useState(null);

  const handleDateRangeChange = (range) => {
    setDateRange(range);
    setError(null);
  };

  const handleSubmit = async () => {
    // 유효성 검사
    if (!dateRange || !dateRange.start || !dateRange.end) {
      setError('대여 기간을 선택해주세요.');
      return;
    }

    // 시작일이 오늘보다 이전이면 안됨
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(dateRange.start);
    startDate.setHours(0, 0, 0, 0);

    if (startDate < today) {
      setError('대여 시작일은 오늘 이후여야 합니다.');
      return;
    }

    // 종료일이 시작일보다 이전이면 안됨
    if (dateRange.end < dateRange.start) {
      setError('종료일은 시작일보다 이후여야 합니다.');
      return;
    }

    const rentMethodText = 
      rentMethod === 'ONLY_ONLINE' ? '택배거래' :
      rentMethod === 'ONLY_OFFLINE' ? '직거래' : '둘 다 가능';

    const rentalInfo = {
      startDate: dateRange.start.toISOString(),
      endDate: dateRange.end.toISOString(),
      rentMethod: rentMethod,
      productTitle: productData?.title || productData?.name || '상품'
    };

    try {
      await onSubmit(rentalInfo, rentMethodText);
      handleClose();
    } catch (err) {
      setError(err.message || '대여 요청 전송에 실패했습니다.');
    }
  };

  const handleClose = () => {
    setDateRange(null);
    setRentMethod('BOTH');
    setError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="대여 다시 요청하기">
      <div className="space-y-6 p-4">
        {/* 상품 정보 */}
        {productData && (
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">상품</div>
            <div className="font-medium text-gray-900">{productData.title || productData.name}</div>
          </div>
        )}

        {/* 날짜 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            대여 기간 선택 *
          </label>
          <DateRangeCalendar
            onDateRangeChange={handleDateRangeChange}
            disabledDates={unavailableDates}
          />
        </div>

        {/* 대여 방법 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            거래 방법 *
          </label>
          <div className="space-y-2">
            <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="rentMethod"
                value="ONLY_ONLINE"
                checked={rentMethod === 'ONLY_ONLINE'}
                onChange={(e) => setRentMethod(e.target.value)}
                className="mr-3"
              />
              <div>
                <div className="font-medium text-gray-900">택배거래</div>
                <div className="text-sm text-gray-500">택배로 배송받습니다</div>
              </div>
            </label>
            <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="rentMethod"
                value="ONLY_OFFLINE"
                checked={rentMethod === 'ONLY_OFFLINE'}
                onChange={(e) => setRentMethod(e.target.value)}
                className="mr-3"
              />
              <div>
                <div className="font-medium text-gray-900">직거래</div>
                <div className="text-sm text-gray-500">직접 만나서 받습니다</div>
              </div>
            </label>
            <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="rentMethod"
                value="BOTH"
                checked={rentMethod === 'BOTH'}
                onChange={(e) => setRentMethod(e.target.value)}
                className="mr-3"
              />
              <div>
                <div className="font-medium text-gray-900">둘 다 가능</div>
                <div className="text-sm text-gray-500">택배거래 또는 직거래 둘 다 가능합니다</div>
              </div>
            </label>
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* 선택된 정보 요약 */}
        {dateRange && dateRange.start && dateRange.end && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">선택된 정보</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <div>
                <span className="font-medium">시작일:</span>{' '}
                {new Date(dateRange.start).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
              <div>
                <span className="font-medium">종료일:</span>{' '}
                {new Date(dateRange.end).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
              <div>
                <span className="font-medium">대여 기간:</span>{' '}
                {Math.ceil((new Date(dateRange.end) - new Date(dateRange.start)) / (1000 * 60 * 60 * 24)) + 1}일
              </div>
              <div>
                <span className="font-medium">거래 방법:</span>{' '}
                {rentMethod === 'ONLY_ONLINE' && '택배거래'}
                {rentMethod === 'ONLY_OFFLINE' && '직거래'}
                {rentMethod === 'BOTH' && '둘 다 가능'}
              </div>
            </div>
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
            disabled={isLoading || !dateRange || !dateRange.start || !dateRange.end}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? '전송 중...' : '요청하기'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default RentalRequestModal;
