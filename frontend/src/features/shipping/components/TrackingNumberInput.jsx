/**
 * TrackingNumberInput Component
 * 송장번호 입력 모달 컴포넌트
 */

import React, { useState } from 'react';
import { Modal } from '@/shared/components/Modal';

const TrackingNumberInput = ({ isOpen, onClose, onSubmit, type = 'outbound' }) => {
  const [courier, setCourier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const couriers = [
    { value: 'cj', label: 'CJ대한통운' },
    { value: 'post', label: '우체국택배' },
    { value: 'lotte', label: '롯데택배' },
    { value: 'hanjin', label: '한진택배' },
    { value: 'logen', label: '로젠택배' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!courier || !trackingNumber) return;

    setIsSubmitting(true);
    try {
      await onSubmit({ courier, trackingNumber, type });
      setCourier('');
      setTrackingNumber('');
      onClose();
    } catch (error) {
      console.error('송장번호 등록 실패:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="송장번호 입력">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            택배사 선택
          </label>
          <select
            value={courier}
            onChange={(e) => setCourier(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            required
          >
            <option value="">택배사를 선택하세요</option>
            {couriers.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            송장번호
          </label>
          <input
            type="text"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value.replace(/\D/g, ''))}
            placeholder="숫자만 입력하세요"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            {type === 'outbound' ? '발송' : '반납'} 송장번호를 정확히 입력해주세요
          </p>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            disabled={isSubmitting}
          >
            취소
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
            disabled={isSubmitting || !courier || !trackingNumber}
          >
            {isSubmitting ? '등록 중...' : '등록하기'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default TrackingNumberInput;
