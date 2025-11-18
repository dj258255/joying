/**
 * TransactionActionButton Component
 * 채팅방 헤더의 거래/결제 관련 버튼 (모듈화)
 */

import React from 'react';
import { getTransactionButtonStyle } from '../../../shared/utils/transactionUtils';

const TransactionActionButton = ({
  productId,
  currentRentalData,
  productData,
  user,
  onCreateTransaction,
  onRentalRequest,
  onTransactionProcess,
  onTransactionView,
  onShipping
}) => {
  // productId가 없으면 버튼 표시 안함
  if (!productId) return null;

  // 판매자인지 확인
  const isSeller = productData?.sellerId === user?.id ||
                   productData?.writer?.memberId === user?.id ||
                   productData?.seller?.id === user?.id;

  // 결제 완료 상태인지 확인 (ESCROW 또는 PAYMENT_COMPLETED)
  const isPaymentCompleted = currentRentalData?.status === 'ESCROW' ||
                              currentRentalData?.status === 'PAYMENT_COMPLETED' ||
                              currentRentalData?.rentalStatus === 'ESCROW';

  // 판매자이고 결제 완료 상태이면 "물품 보내기" 버튼도 표시
  const showShippingButton = isSeller && isPaymentCompleted && onShipping;

  return (
    <div className="flex gap-2">
      {/* 거래 보기 버튼 - 전체 플로우 모달 */}
      {currentRentalData?.rentalHisId && onTransactionView && (
        <button
          onClick={onTransactionView}
          className="px-2 py-1.5 sm:px-4 sm:py-2 bg-gray-900 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors whitespace-nowrap"
        >
          거래 보기
        </button>
      )}

      {/* 거래 처리 버튼 - 거래는 있지만 거래 보기 버튼이 표시되지 않을 때 */}
      {currentRentalData?.rentalHisId && !onTransactionView && onTransactionProcess && (
        <button
          onClick={onTransactionProcess}
          className="px-2 py-1.5 sm:px-4 sm:py-2 bg-gray-900 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors whitespace-nowrap"
        >
          거래 보기
        </button>
      )}

      {showShippingButton && (
        <button
          onClick={onShipping}
          className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-all duration-200 shadow-sm hover:shadow-md"
        >
          📦 물품 보내기
        </button>
      )}
    </div>
  );
};

export default TransactionActionButton;
