/**
 * TossPaymentWidget Component
 * 토스 페이먼츠 결제창 API 컴포넌트 (훅 방식)
 */

import { useEffect, useRef } from 'react';
import { loadTossPayments } from '@tosspayments/payment-sdk';

/**
 * @param {Object} props
 * @param {string} props.clientKey - 토스 페이먼츠 클라이언트 키
 * @param {string} props.orderId - 주문 ID
 * @param {number} props.amount - 결제 금액
 * @param {string} props.orderName - 주문명
 * @param {string} props.method - 결제 수단 ('카드', '가상계좌', '계좌이체', '휴대폰', '상품권', '간편결제')
 * @param {Function} props.onSuccess - 결제 성공 콜백
 * @param {Function} props.onError - 결제 실패 콜백
 */
const TossPaymentWidget = ({
  clientKey,
  orderId,
  amount,
  orderName,
  method = '카드',
  onSuccess,
  onError
}) => {
  const tossPaymentsRef = useRef(null);

  // 환경 변수 확인 로그
  const envClientKey = import.meta.env.VITE_TOSS_CLIENT_KEY?.trim();
  console.log('[TossPaymentWidget] VITE_TOSS_CLIENT_KEY 확인:', {
    exists: !!import.meta.env.VITE_TOSS_CLIENT_KEY,
    envValue: envClientKey ? `${envClientKey.substring(0, 15)}...` : 'undefined',
    propValue: clientKey ? `${clientKey.substring(0, 15)}...` : 'undefined',
    match: envClientKey === clientKey
  });

  useEffect(() => {
    // 토스 페이먼츠 SDK 로드
    const loadWidget = async () => {
      console.log('[TossPaymentWidget] SDK 로드 시작:', {
        clientKey: clientKey ? `${clientKey.substring(0, 15)}...` : 'undefined',
        orderId,
        amount
      });

      if (!clientKey) {
        console.error('[TossPaymentWidget] ❌ clientKey가 없습니다!', {
          envKey: import.meta.env.VITE_TOSS_CLIENT_KEY,
          propKey: clientKey
        });
        onError?.(new Error('클라이언트 키가 제공되지 않았습니다.'));
        return;
      }

      try {
        const tossPayments = await loadTossPayments(clientKey);
        tossPaymentsRef.current = tossPayments;
        console.log('[TossPaymentWidget] ✅ SDK 로드 성공');
      } catch (error) {
        console.error('[TossPaymentWidget] ❌ SDK 로드 실패:', error, {
          clientKey: clientKey ? `${clientKey.substring(0, 15)}...` : 'undefined'
        });
        onError?.(error);
      }
    };

    if (clientKey && amount > 0) {
      loadWidget();
    } else {
      console.warn('[TossPaymentWidget] SDK 로드 조건 불만족:', {
        hasClientKey: !!clientKey,
        amount,
        amountValid: amount > 0
      });
    }

    // 정리 함수
    return () => {
      if (tossPaymentsRef.current) {
        tossPaymentsRef.current = null;
      }
    };
  }, [clientKey, amount, onError]);

  // 결제 요청
  const requestPayment = async () => {
    if (!tossPaymentsRef.current) {
      onError?.(new Error('결제 시스템이 로드되지 않았습니다.'));
      return;
    }

    try {
      // 결제창 호출
      await tossPaymentsRef.current.requestPayment(method, {
        amount: amount,
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
