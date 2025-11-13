/**
 * CancelDetailModal Component
 * 취소 요청 상세 모달 - 취소 사유 확인 및 승인/거절
 */

import React, { useState } from 'react';
import Modal from '../../../shared/components/Modal/Modal';

const CancelDetailModal = ({ isOpen, onClose, cancelInfo, onApprove, onReject, isProcessing }) => {
  if (!cancelInfo) return null;

  const {
    reason,
    buyerRefund,
    sellerRefund,
    requesterName,
    cancelId,
    rentalHisId
  } = cancelInfo;

  const totalDeposit = (buyerRefund || 0) + (sellerRefund || 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="취소 요청 상세">
      <div className="space-y-6">
        {/* 요청자 정보 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <svg className="w-5 h-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
            <span className="font-semibold text-blue-900">
              {requesterName || '상대방'}님이 취소를 요청했습니다
            </span>
          </div>
        </div>

        {/* 취소 사유 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            취소 사유
          </label>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-gray-900 whitespace-pre-wrap">{reason}</p>
          </div>
        </div>

        {/* 보증금 분배 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            보증금 분배 내역
          </label>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-sm font-medium text-gray-700">구매자 환불</span>
              <span className="text-lg font-bold text-blue-600">
                {(buyerRefund || 0).toLocaleString()}원
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 border border-green-200 rounded-lg">
              <span className="text-sm font-medium text-gray-700">판매자 환불</span>
              <span className="text-lg font-bold text-green-600">
                {(sellerRefund || 0).toLocaleString()}원
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-100 border border-gray-300 rounded-lg">
              <span className="text-sm font-medium text-gray-700">총 보증금</span>
              <span className="text-lg font-bold text-gray-900">
                {totalDeposit.toLocaleString()}원
              </span>
            </div>
          </div>
        </div>

        {/* 안내 메시지 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="text-xs text-yellow-800">
              <div className="font-medium mb-1">주의사항</div>
              <ul className="list-disc list-inside space-y-1">
                <li>승인 시 거래가 취소되고 보증금이 분배됩니다.</li>
                <li>거절 시 거래가 계속 진행됩니다.</li>
                <li>신중하게 결정해주세요.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-3">
          <button
            onClick={onReject}
            disabled={isProcessing}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? '처리 중...' : '취소 거절'}
          </button>
          <button
            onClick={onApprove}
            disabled={isProcessing}
            className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? '처리 중...' : '취소 승인'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CancelDetailModal;
