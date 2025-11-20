/**
 * PaymentReceiptModal Component
 * 결제 영수증 모달 컴포넌트
 */

import React from 'react';
import { Modal } from '@/shared/components/Modal';

/**
 * @param {Object} props
 * @param {boolean} props.isOpen - 모달 열림 상태
 * @param {Function} props.onClose - 모달 닫기 핸들러
 * @param {Object} props.payment - 결제 정보
 */
const PaymentReceiptModal = ({ isOpen, onClose, payment }) => {
  if (!payment) return null;

  const {
    id,
    amount,
    method,
    status,
    createdAt,
    product,
    user
  } = payment;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(value);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('ko-KR');
  };

  const getStatusText = (status) => {
    const statusMap = {
      'completed': '결제 완료',
      'pending': '결제 대기',
      'failed': '결제 실패',
      'cancelled': '결제 취소'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status) => {
    const colorMap = {
      'completed': 'text-green-600 bg-green-100',
      'pending': 'text-yellow-600 bg-yellow-100',
      'failed': 'text-red-600 bg-red-100',
      'cancelled': 'text-gray-600 bg-gray-100'
    };
    return colorMap[status] || 'text-gray-600 bg-gray-100';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="결제 영수증">
      <div className="space-y-6">
        {/* 결제 정보 */}
        <div className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl p-4">
          <h3 className="font-semibold text-gray-900 mb-3">결제 정보</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">결제 ID</span>
              <span className="font-mono text-gray-900">{id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">결제 금액</span>
              <span className="font-semibold text-gray-900">{formatCurrency(amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">결제 방법</span>
              <span className="text-gray-900">{method}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">결제 상태</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                {getStatusText(status)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">결제 시간</span>
              <span className="text-gray-900">{formatDate(createdAt)}</span>
            </div>
          </div>
        </div>

        {/* 상품 정보 */}
        {product && (
          <div className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl p-4">
            <h3 className="font-semibold text-gray-900 mb-3">상품 정보</h3>
            <div className="flex items-center space-x-3">
              {product.image && (
                <img
                  src={product.image}
                  alt={product.title}
                  className="w-16 h-16 object-cover rounded-lg"
                />
              )}
              <div>
                <div className="font-medium text-gray-900">{product.title}</div>
                <div className="text-sm text-gray-600">{product.category}</div>
              </div>
            </div>
          </div>
        )}

        {/* 사용자 정보 */}
        {user && (
          <div className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl p-4">
            <h3 className="font-semibold text-gray-900 mb-3">대여자 정보</h3>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full flex items-center justify-center">
                <span className="text-gray-900 font-medium">
                  {user.nickname?.charAt(0) || '?'}
                </span>
              </div>
              <div>
                <div className="font-medium text-gray-900">{user.nickname || '알 수 없음'}</div>
                <div className="text-sm text-gray-600">{user.email}</div>
              </div>
            </div>
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 glass-button-ghost text-gray-900 rounded-2xl font-semibold text-base hover:bg-white/30 transition-colors"
          >
            닫기
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 glass-button text-white rounded-2xl font-semibold text-base hover:bg-gray-900/90 transition-colors"
          >
            인쇄
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default PaymentReceiptModal;
