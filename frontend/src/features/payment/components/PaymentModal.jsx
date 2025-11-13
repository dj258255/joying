/**
 * PaymentModal Component
 * 토스 페이먼츠 결제창 API 모달 컴포넌트
 */

import React, { useEffect, useRef, useState } from 'react';
import { loadTossPayments } from '@tosspayments/payment-sdk';
import Modal from '../../../shared/components/Modal/Modal';
import { useAuth } from '@/features/auth/contexts/AuthContext';

/**
 * @param {Object} props
 * @param {boolean} props.isOpen - 모달 열림 상태
 * @param {Function} props.onClose - 모달 닫기 핸들러
 * @param {string} props.orderId - 주문 ID
 * @param {number} props.amount - 결제 금액
 * @param {string} props.orderName - 주문명
 * @param {number} props.chatRoomId - 채팅방 ID (결제 완료 후 메시지 전송용)
 * @param {number} props.rentalHisId - 대여 이력 ID
 * @param {Function} props.onSuccess - 결제 성공 콜백
 * @param {Function} props.onError - 결제 실패 콜백
 */
const PaymentModal = ({
  isOpen,
  onClose,
  orderId,
  amount,
  orderName,
  chatRoomId,
  rentalHisId,
  onSuccess,
  onError
}) => {
  const tossPaymentsRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState('카드');
  const { user } = useAuth();

  // 토스 페이먼츠 클라이언트 키
  const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY?.trim();

  // 환경 변수 확인 로그
  console.log('[PaymentModal] VITE_TOSS_CLIENT_KEY 확인:', {
    exists: !!import.meta.env.VITE_TOSS_CLIENT_KEY,
    value: import.meta.env.VITE_TOSS_CLIENT_KEY ? `${import.meta.env.VITE_TOSS_CLIENT_KEY.substring(0, 15)}...` : 'undefined',
    trimmed: clientKey ? `${clientKey.substring(0, 15)}...` : 'undefined',
    length: clientKey?.length || 0,
    allEnvKeys: Object.keys(import.meta.env).filter(key => key.includes('TOSS') || key.includes('VITE'))
  });

  // 결제 수단 목록
  const paymentMethods = [
    { value: '카드', label: '신용/체크카드' },
    { value: '가상계좌', label: '가상계좌' },
    { value: '계좌이체', label: '계좌이체' },
    { value: '휴대폰', label: '휴대폰 결제' },
    { value: '상품권', label: '상품권' },
    { value: '간편결제', label: '간편결제' }
  ];

  // 토스 페이먼츠 SDK 로드
  useEffect(() => {
    if (!isOpen) return;

    // 클라이언트 키 검증
    console.log('[PaymentModal] 클라이언트 키 검증 시작:', {
      clientKey: clientKey ? `${clientKey.substring(0, 15)}...` : 'undefined',
      isEmpty: !clientKey || clientKey === '' || clientKey === "''" || clientKey === '""',
      rawValue: import.meta.env.VITE_TOSS_CLIENT_KEY
    });

    if (!clientKey || clientKey === '' || clientKey === "''" || clientKey === '""') {
      console.error('[PaymentModal] ❌ 클라이언트 키가 없습니다!', {
        rawEnv: import.meta.env.VITE_TOSS_CLIENT_KEY,
        trimmed: clientKey,
        allEnv: Object.keys(import.meta.env).filter(key => key.startsWith('VITE_'))
      });
      const err = new Error('토스 페이먼츠 클라이언트 키가 설정되지 않았습니다. .env 파일에 VITE_TOSS_CLIENT_KEY를 설정해주세요.');
      setError(err.message);
      onError?.(err);
      return;
    }

    console.log('[PaymentModal] ✅ 클라이언트 키 검증 통과:', {
      prefix: clientKey.substring(0, 10),
      length: clientKey.length
    });

    if (clientKey.startsWith('test_sk_') || clientKey.startsWith('live_sk_')) {
      const err = new Error('시크릿 키(Secret Key)를 사용하고 있습니다. 클라이언트 키(Client Key: test_ck_... 또는 live_ck_...)를 사용해야 합니다.');
      setError(err.message);
      onError?.(err);
      return;
    }

    if (!clientKey.startsWith('test_ck_') && !clientKey.startsWith('live_ck_')) {
      const err = new Error('올바르지 않은 클라이언트 키 형식입니다. test_ck_... 또는 live_ck_...로 시작해야 합니다.');
      setError(err.message);
      onError?.(err);
      return;
    }

    const initTossPayments = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.log('[PaymentModal] 토스 페이먼츠 SDK 로드 시작:', {
          clientKey: clientKey.substring(0, 15) + '...',
          clientKeyLength: clientKey.length
        });

        const tossPayments = await loadTossPayments(clientKey);
        tossPaymentsRef.current = tossPayments;

        console.log('[PaymentModal] 토스 페이먼츠 SDK 로드 성공');
        setIsLoading(false);
      } catch (err) {
        console.error('[PaymentModal] 토스 페이먼츠 SDK 로드 실패:', err);
        setError('결제 시스템을 불러오는데 실패했습니다. 클라이언트 키를 확인해주세요.');
        setIsLoading(false);
        onError?.(err);
      }
    };

    initTossPayments();
  }, [isOpen, clientKey, onError]);

  // 결제 요청 핸들러
  const handlePayment = async () => {
    if (!tossPaymentsRef.current) {
      const err = new Error('결제 시스템이 로드되지 않았습니다.');
      setError(err.message);
      onError?.(err);
      return;
    }

    if (!orderId || !amount || amount <= 0) {
      const err = new Error('주문 정보가 올바르지 않습니다.');
      setError(err.message);
      onError?.(err);
      return;
    }

    if (amount < 100) {
      const err = new Error('결제 금액은 최소 100원 이상이어야 합니다.');
      setError(err.message);
      onError?.(err);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // 실제 사용자 정보 가져오기
      const customerEmail = user?.email || user?.memberEmail || 'customer@example.com';
      const customerName = user?.name || user?.memberName || user?.username || '고객';

      console.log('[PaymentModal] 결제 요청 시작:', {
        method: selectedMethod,
        orderId,
        orderName,
        amount,
        customerEmail,
        customerName
      });

      // 결제창 URL 생성
      const successUrl = new URL(`${window.location.origin}/payments/success`);
      successUrl.searchParams.set('orderId', orderId);
      if (chatRoomId) successUrl.searchParams.set('chatRoomId', chatRoomId);
      if (rentalHisId) successUrl.searchParams.set('rentalHisId', rentalHisId);

      const failUrl = new URL(`${window.location.origin}/payments/fail`);
      failUrl.searchParams.set('orderId', orderId);

      // 결제창 호출
      await tossPaymentsRef.current.requestPayment(selectedMethod, {
        amount,
        orderId,
        orderName,
        customerName,
        customerEmail,
        successUrl: successUrl.toString(),
        failUrl: failUrl.toString()
      });

      console.log('[PaymentModal] 결제창 호출 성공');
      // 결제창이 열리면 모달은 자동으로 닫힘
      // 실제 결제 완료는 PaymentSuccessPage에서 처리됨
    } catch (err) {
      console.error('[PaymentModal] 결제 요청 실패:', err);
      const errorMessage = err.message || '결제 요청에 실패했습니다.';

      if (errorMessage.includes('USER_CANCEL')) {
        // 사용자가 결제를 취소한 경우 에러 메시지 표시 안 함
        console.log('[PaymentModal] 사용자가 결제를 취소했습니다.');
      } else {
        setError(errorMessage);
        onError?.(err);
      }

      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  // 모달이 열릴 때마다 환경 변수 확인
  console.log('[PaymentModal] 모달 렌더링 - VITE_TOSS_CLIENT_KEY 최종 확인:', {
    isOpen,
    clientKey: clientKey ? `${clientKey.substring(0, 15)}...` : 'undefined',
    exists: !!import.meta.env.VITE_TOSS_CLIENT_KEY,
    orderId,
    amount
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="결제하기">
      <div className="space-y-6 p-4">
        {/* 주문 정보 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">주문번호</span>
            <span className="text-sm font-medium">{orderId}</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">주문명</span>
            <span className="text-sm font-medium">{orderName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">결제 금액</span>
            <span className="text-lg font-bold text-blue-600">
              {amount?.toLocaleString()}원
            </span>
          </div>
        </div>

        {/* 결제 수단 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            결제 수단 선택
          </label>
          <div className="grid grid-cols-2 gap-2">
            {paymentMethods.map((method) => (
              <button
                key={method.value}
                type="button"
                onClick={() => setSelectedMethod(method.value)}
                className={`py-3 px-4 rounded-lg border-2 transition-all ${
                  selectedMethod === method.value
                    ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                {method.label}
              </button>
            ))}
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-600 font-medium mb-2">{error}</p>
            {error.includes('클라이언트 키') && (
              <div className="text-xs text-red-500 space-y-1 mt-3">
                <p className="font-semibold mb-2 text-base">🔧 해결 방법:</p>
                <div className="bg-white rounded p-3 mt-2 space-y-2">
                  <p className="font-semibold">1. 토스 페이먼츠 대시보드 확인</p>
                  <p className="pl-2">→ https://developers.tosspayments.com 로그인</p>
                  <p className="pl-2">→ "개발자센터" → "API 키" 메뉴</p>

                  <p className="font-semibold mt-3">2. 클라이언트 키 확인</p>
                  <p className="pl-2">→ 테스트용 클라이언트 키 복사</p>
                  <p className="pl-2">→ 형식: test_ck_...</p>

                  <p className="font-semibold mt-3">3. .env 파일 설정</p>
                  <p className="pl-2">→ frontend/.env 파일 열기</p>
                  <p className="pl-2">→ VITE_TOSS_CLIENT_KEY=복사한_클라이언트_키</p>

                  <p className="font-semibold mt-3">4. 개발 서버 재시작</p>
                  <p className="pl-2">→ Ctrl+C 후 npm run dev 재실행</p>
                </div>
                <p className="mt-3 text-orange-600 font-semibold">
                  💡 결제창 API는 사업자 등록 없이도 테스트 가능합니다!
                </p>
              </div>
            )}
          </div>
        )}

        {/* 안내 메시지 */}
        {!error && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-700">
              💡 결제하기 버튼을 클릭하면 토스 페이먼츠 결제창이 열립니다.
            </p>
          </div>
        )}

        {/* 결제 버튼 */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-3 px-4 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            취소
          </button>
          <button
            onClick={handlePayment}
            disabled={isLoading || !!error}
            className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                처리 중...
              </span>
            ) : (
              `${amount?.toLocaleString()}원 결제하기`
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default PaymentModal;
