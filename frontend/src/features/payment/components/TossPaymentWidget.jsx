/**
 * TossPaymentWidget Component
 * 토스 페이먼츠 결제 위젯 컴포넌트
 */

import { useEffect, useRef } from 'react';
import { loadPaymentWidget } from '@tosspayments/payment-widget-sdk';

/**
 * @param {Object} props
 * @param {string} props.clientKey - 토스 페이먼츠 클라이언트 키
 * @param {string} props.customerKey - 고객 키 (사용자 ID)
 * @param {string} props.orderId - 주문 ID
 * @param {number} props.amount - 결제 금액
 * @param {string} props.orderName - 주문명
 * @param {Function} props.onSuccess - 결제 성공 콜백 (paymentKey, orderId 전달)
 * @param {Function} props.onError - 결제 실패 콜백
 */
const TossPaymentWidget = ({
  clientKey,
  customerKey,
  orderId,
  amount,
  orderName,
  onSuccess,
  onError
}) => {
  const paymentWidgetRef = useRef(null);
  const paymentMethodsWidgetRef = useRef(null);

  useEffect(() => {
    // 토스 페이먼츠 위젯 로드
    const loadWidget = async () => {
      try {
        const paymentWidget = await loadPaymentWidget(clientKey, customerKey);
        paymentWidgetRef.current = paymentWidget;

        // 결제 수단 위젯 렌더링
        const paymentMethodsWidget = paymentWidget.renderPaymentMethods(
          '#payment-widget',
          { value: amount },
          { variantKey: 'DEFAULT' }
        );
        paymentMethodsWidgetRef.current = paymentMethodsWidget;

        // 이용약관 위젯 렌더링
        paymentWidget.renderAgreement('#agreement', { variantKey: 'AGREEMENT' });
      } catch (error) {
        console.error('토스 페이먼츠 위젯 로드 실패:', error);
        onError?.(error);
      }
    };

    if (clientKey && customerKey && amount > 0) {
      loadWidget();
    }

    // 정리 함수
    return () => {
      if (paymentMethodsWidgetRef.current) {
        paymentMethodsWidgetRef.current = null;
      }
      if (paymentWidgetRef.current) {
        paymentWidgetRef.current = null;
      }
    };
  }, [clientKey, customerKey, amount, onError]);

  // 결제 요청
  const requestPayment = async () => {
    if (!paymentWidgetRef.current) {
      onError?.(new Error('결제 위젯이 로드되지 않았습니다.'));
      return;
    }

    try {
      // 결제 위젯에서 결제 정보 요청
      await paymentWidgetRef.current.requestPayment({
        orderId: orderId,
        orderName: orderName,
        successUrl: `${window.location.origin}/payments/success`,
        failUrl: `${window.location.origin}/payments/fail`,
        customerEmail: 'customer@example.com', // TODO: 실제 고객 이메일 사용
        customerName: '고객명', // TODO: 실제 고객명 사용
      });
    } catch (error) {
      console.error('결제 요청 실패:', error);
      onError?.(error);
    }
  };

  // 외부에서 호출할 수 있도록 ref 반환
  return {
    requestPayment
  };
};

export default TossPaymentWidget;

