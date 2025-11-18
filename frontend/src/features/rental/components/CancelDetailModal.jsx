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
    <Modal isOpen={isOpen} onClose={onClose} title="취소 요청 상세" className="max-w-2xl">
      <div className="space-y-6">
        {/* 요청자 정보 */}
        <div className="bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl p-6 shadow-lg">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-gray-900 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
            <span className="font-bold text-gray-900 text-lg">
              {requesterName || '상대방'}님이 취소를 요청했습니다
            </span>
          </div>
        </div>

        {/* 취소 사유 */}
        <div>
          <label className="block text-base font-semibold text-gray-900 mb-3">
            취소 사유
          </label>
          <div className="bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl p-6 shadow-lg">
            <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">{reason}</p>
          </div>
        </div>

        {/* 보증금 분배 */}
        <div>
          <label className="block text-base font-semibold text-gray-900 mb-4">
            보증금 분배 내역
          </label>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-5 bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl shadow-lg">
              <span className="text-base font-semibold text-gray-900">대여자 환불</span>
              <span className="text-xl font-bold text-gray-900">
                {(buyerRefund || 0).toLocaleString()}원
              </span>
            </div>
            <div className="flex justify-between items-center p-5 bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl shadow-lg">
              <span className="text-base font-semibold text-gray-900">소유자 환불</span>
              <span className="text-xl font-bold text-gray-900">
                {(sellerRefund || 0).toLocaleString()}원
              </span>
            </div>
            <div className="flex justify-between items-center p-5 bg-gray-900/80 backdrop-blur-xl border border-gray-900/50 rounded-3xl shadow-lg">
              <span className="text-base font-semibold text-white">총 보증금</span>
              <span className="text-xl font-bold text-white">
                {totalDeposit.toLocaleString()}원
              </span>
            </div>
          </div>
        </div>

        {/* 안내 메시지 */}
        <div className="bg-yellow-500/20 backdrop-blur-xl border border-yellow-400/50 rounded-3xl p-6 shadow-lg">
          <div className="flex items-start">
            <svg className="w-6 h-6 text-yellow-900 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-gray-900">
              <div className="font-bold mb-2">주의사항</div>
              <ul className="space-y-1.5 leading-relaxed">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>승인 시 거래가 취소되고 보증금이 분배됩니다.</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>거절 시 거래가 계속 진행됩니다.</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>신중하게 결정해주세요.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-3">
          <button
            onClick={onReject}
            disabled={isProcessing}
            className="flex-1 px-6 py-3 glass-button-ghost text-gray-900 rounded-2xl font-semibold text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? '처리 중...' : '취소 거절'}
          </button>
          <button
            onClick={onApprove}
            disabled={isProcessing}
            className="flex-1 px-6 py-3 glass-button-danger text-white rounded-2xl font-semibold text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? '처리 중...' : '취소 승인'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CancelDetailModal;
