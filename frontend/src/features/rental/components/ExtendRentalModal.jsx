/**
 * ExtendRentalModal Component
 * 대여 기간 연장 모달 컴포넌트
 */

import React, { useState, useEffect } from 'react';
import Modal from '../../../shared/components/Modal/Modal';
import { rentalApi } from '../api/rentalApi';
import DateRangeCalendar from '../../checkout/components/DateRangeCalendar';

/**
 * @param {Object} props
 * @param {boolean} props.isOpen - 모달 열림 상태
 * @param {Function} props.onClose - 모달 닫기 핸들러
 * @param {Object} props.rentalData - 대여 거래 정보
 * @param {Function} props.onExtendSuccess - 연장 성공 콜백
 */
const ExtendRentalModal = ({ isOpen, onClose, rentalData, onExtendSuccess }) => {
  const [newEndDate, setNewEndDate] = useState(null);
  const [additionalFee, setAdditionalFee] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // 기존 종료일
  const originalEndDate = rentalData?.endRen ? new Date(rentalData.endRen) : null;
  const dailyFee = rentalData?.fee || 0;

  // 날짜 범위 변경 핸들러
  const handleDateRangeChange = (dateRange) => {
    if (dateRange && dateRange.end) {
      const selectedEndDate = new Date(dateRange.end);
      selectedEndDate.setHours(0, 0, 0, 0);
      
      // 기존 종료일보다 이후인지 확인
      if (originalEndDate) {
        const originalEnd = new Date(originalEndDate);
        originalEnd.setHours(0, 0, 0, 0);
        
        // 기존 종료일보다 이후여야 함
        if (selectedEndDate <= originalEnd) {
          setNewEndDate(null);
          setAdditionalFee(0);
          return;
        }
        
        // 연장 일수 계산 (기존 종료일 다음 날부터 새 종료일까지)
        const days = Math.ceil((selectedEndDate - originalEnd) / (1000 * 60 * 60 * 24));
        const calculatedFee = days > 0 ? days * dailyFee : 0;
        setAdditionalFee(calculatedFee);
      }
      
      setNewEndDate(selectedEndDate);
    } else {
      setNewEndDate(null);
      setAdditionalFee(0);
    }
  };

  // 모달 열릴 때 초기화
  useEffect(() => {
    if (isOpen && originalEndDate) {
      setNewEndDate(null);
      setAdditionalFee(0);
      setError(null);
    }
  }, [isOpen, originalEndDate]);

  // 연장 요청
  const handleExtend = async () => {
    if (!newEndDate) {
      setError('새로운 종료일을 선택해주세요.');
      return;
    }

    if (!originalEndDate) {
      setError('기존 대여 정보를 불러올 수 없습니다.');
      return;
    }

    // 새 종료일이 기존 종료일보다 늦어야 함
    if (new Date(newEndDate) <= originalEndDate) {
      setError('새로운 종료일은 기존 종료일보다 늦어야 합니다.');
      return;
    }

    if (additionalFee <= 0) {
      setError('추가 대여료를 확인해주세요.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const rentalHisId = rentalData?.rentalHisId || rentalData?.id;
      if (!rentalHisId) {
        throw new Error('대여 이력 ID를 찾을 수 없습니다.');
      }

      const result = await rentalApi.extendRental(rentalHisId, {
        newEndRen: newEndDate,
        additionalFee: additionalFee
      });

      console.log('[ExtendRentalModal] 연장 성공:', result);

      if (onExtendSuccess) {
        onExtendSuccess(result);
      }

      onClose();
    } catch (err) {
      console.error('[ExtendRentalModal] 연장 실패:', err);
      const errorMessage = err.response?.data?.error 
        || err.response?.data?.message 
        || err.message 
        || '대여 기간 연장에 실패했습니다.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!rentalData) return null;

  // 연장 일수 계산 (기존 종료일 다음 날부터 새 종료일까지)
  const days = newEndDate && originalEndDate
    ? (() => {
        const originalEnd = new Date(originalEndDate);
        originalEnd.setHours(0, 0, 0, 0);
        const newEnd = newEndDate instanceof Date ? newEndDate : new Date(newEndDate);
        newEnd.setHours(0, 0, 0, 0);
        
        // 기존 종료일보다 이후인지 확인
        if (newEnd <= originalEnd) {
          return 0;
        }
        
        // 일수 차이 계산
        return Math.ceil((newEnd.getTime() - originalEnd.getTime()) / (1000 * 60 * 60 * 24));
      })()
    : 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="대여 기간 연장" className="max-w-2xl">
      <div className="space-y-6">
        {/* 기존 대여 정보 */}
        <div className="bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl p-6 shadow-lg">
          <h3 className="text-base font-semibold text-gray-900 mb-4">기존 대여 정보</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">기존 종료일</span>
              <span className="font-medium text-gray-900">
                {originalEndDate ? originalEndDate.toLocaleDateString('ko-KR') : '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">일일 대여료</span>
              <span className="font-medium text-gray-900">{dailyFee.toLocaleString()}원</span>
            </div>
          </div>
        </div>

        {/* 새로운 종료일 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-3">
            새로운 종료일 선택 <span className="text-red-500">*</span>
          </label>
          <DateRangeCalendar
            onDateRangeChange={(range) => {
              if (!range || !originalEndDate) {
                setNewEndDate(null);
                setAdditionalFee(0);
                return;
              }

              // 연장의 경우: 사용자가 선택한 날짜를 종료일로 사용
              // 시작일은 기존 종료일의 다음 날로 자동 설정
              const selectedDate = range.end || range.start;
              
              if (!selectedDate) {
                setNewEndDate(null);
                setAdditionalFee(0);
                return;
              }

              const originalEnd = new Date(originalEndDate);
              originalEnd.setHours(0, 0, 0, 0);
              
              const selected = new Date(selectedDate);
              selected.setHours(0, 0, 0, 0);
              
              // 선택한 날짜가 기존 종료일보다 이후인지 확인
              if (selected > originalEnd) {
                handleDateRangeChange({ end: selected });
              } else {
                // 기존 종료일 이하를 선택한 경우 무시
                setNewEndDate(null);
                setAdditionalFee(0);
              }
            }}
            availableStartDate={originalEndDate ? (() => {
              // 기존 종료일의 다음 날을 시작일로 설정
              const nextDay = new Date(originalEndDate);
              nextDay.setDate(nextDay.getDate() + 1);
              nextDay.setHours(0, 0, 0, 0);
              return nextDay;
            })() : null}
            initialStartDate={null}
            initialEndDate={null}
          />
          {originalEndDate && (
            <p className="text-xs text-gray-600 mt-2">
              💡 기존 종료일({originalEndDate.toLocaleDateString('ko-KR')}) 이후 날짜를 선택해주세요.
            </p>
          )}
        </div>

        {/* 연장 정보 요약 */}
        {newEndDate && days > 0 && (
          <div className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl p-4">
            <h4 className="font-medium text-gray-900 mb-3">연장 정보</h4>
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-700">연장 일수</span>
                <span className="text-gray-900 font-medium">{days}일</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">일일 대여료</span>
                <span className="text-gray-900 font-medium">{dailyFee.toLocaleString()}원</span>
              </div>
              <div className="pt-2 border-t border-white/50 flex justify-between">
                <span className="font-semibold text-gray-900">추가 대여료</span>
                <span className="font-bold text-lg text-gray-900">{additionalFee.toLocaleString()}원</span>
              </div>
            </div>
          </div>
        )}

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-500/20 backdrop-blur-xl border border-red-400/50 rounded-3xl p-6 shadow-lg">
            <p className="text-sm text-red-900 font-semibold">{error}</p>
          </div>
        )}

        {/* 버튼 */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-6 py-3 glass-button-ghost text-gray-900 rounded-2xl font-semibold text-base disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={handleExtend}
            disabled={isLoading || !newEndDate || days <= 0 || additionalFee <= 0}
            className="flex-1 px-6 py-3 glass-button text-white rounded-2xl font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '처리 중...' : '연장하기'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ExtendRentalModal;

