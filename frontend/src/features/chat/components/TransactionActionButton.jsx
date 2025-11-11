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
  onTransactionProcess
}) => {
  // productId가 없으면 버튼 표시 안함
  if (!productId) return null;

  // 무조건 "거래 보기" 버튼으로 표시
  return (
    <button
      onClick={onTransactionProcess}
      className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
    >
      거래 보기
    </button>
  );
};

export default TransactionActionButton;
