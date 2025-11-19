/**
 * TransactionActionButton Component
 * 채팅방 헤더의 거래/결제 관련 버튼 (모듈화)
 */

import React from 'react';
import { getTransactionButtonStyle } from '../../../shared/utils/transactionUtils';
import { checkStepCompleted, TRANSACTION_STEPS } from '../../../shared/utils/transactionStepUtils';

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
  const [buttonStates, setButtonStates] = React.useState({
    create: { enabled: true },
    shipping: { enabled: false }
  });

  // productId가 없으면 버튼 표시 안함
  if (!productId) return null;

  // 판매자인지 확인 (BORROW 타입 고려)
  const isBorrowProduct = productData?.uploadType === 'BORROW';
  const currentUserId = user?.id || user?.memberId;
  const sellerId = productData?.sellerId
    || productData?.writer?.memberId
    || productData?.seller?.id;
  const isProductOwner = sellerId && Number(sellerId) === Number(currentUserId);
  
  // BORROW: B(채팅 건 사람)가 거래 생성/발송 담당 = seller, A(상품 주인) = buyer
  // RENT: 상품 주인(빌려줄 사람) = 판매자(거래 생성/발송 담당), 상대방 = 구매자
  const isSeller = isBorrowProduct
    ? !isProductOwner  // BORROW: 상품 주인이 아니면 판매자 (채팅 건 사람)
    : isProductOwner;  // RENT: 상품 주인이 판매자

  // 버튼 활성화 여부 확인
  React.useEffect(() => {
    const checkButtons = async () => {
      if (!currentRentalData) {
        setButtonStates({
          create: { enabled: true },
          shipping: { enabled: false }
        });
        return;
      }

      const rentalHisId = currentRentalData.rentalHisId;

      // 거래 생성 버튼: 거래가 없을 때만 활성화
      const createEnabled = !rentalHisId;

      // 발송 버튼: 판매자이고 결제 완료 후, 발송 전에만 활성화
      const isPaymentCompleted = await checkStepCompleted(
        TRANSACTION_STEPS.PAYMENT,
        currentRentalData,
        rentalHisId
      );
      const isShippingCompleted = await checkStepCompleted(
        TRANSACTION_STEPS.SHIPPING_TRACKING,
        currentRentalData,
        rentalHisId
      );
      const shippingEnabled = isSeller && isPaymentCompleted && !isShippingCompleted && onShipping;

      setButtonStates({
        create: { enabled: createEnabled },
        shipping: { enabled: shippingEnabled }
      });
    };

    checkButtons();
  }, [currentRentalData, isSeller, onShipping]);

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
      {/* 물품 보내기 버튼 삭제 - 모든 거래 단계를 시스템 메시지로 통합 */}
    </div>
  );
};

export default TransactionActionButton;
