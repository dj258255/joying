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

  // 현재 사용자 ID와 판매자 ID 확인
  const currentUserId = user?.id || user?.memberId;
  const sellerId = productData?.sellerId
    || productData?.writer?.memberId
    || productData?.writer?.member_id
    || productData?.seller?.id
    || productData?.seller?.memberId
    || productData?.seller?.member_id;
  const isSeller = sellerId && Number(sellerId) === Number(currentUserId);

  // 거래가 생성되지 않은 경우
  if (!currentRentalData) {
    if (isSeller) {
      // 판매자: 거래 생성하기
      return (
        <button
          onClick={onCreateTransaction}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
        >
          거래 생성하기
        </button>
      );
    } else {
      // 구매자: 대여 요청하기
      return (
        <button
          onClick={onRentalRequest}
          className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-all duration-200 shadow-sm hover:shadow-md"
        >
          대여 요청하기
        </button>
      );
    }
  }

  // 거래가 생성된 경우: 거래 프로세스 버튼
  const status = currentRentalData?.status || currentRentalData?.rentalStatus;
  const { text: buttonText, color: buttonColor } = getTransactionButtonStyle(status, isSeller);

  return (
    <button
      onClick={onTransactionProcess}
      className={`px-4 py-2 ${buttonColor} text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-sm hover:shadow-md`}
    >
      {buttonText}
    </button>
  );
};

export default TransactionActionButton;
