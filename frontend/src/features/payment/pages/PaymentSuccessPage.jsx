/**
 * PaymentSuccessPage Component
 * 결제 성공 페이지 컴포넌트
 */

import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { paymentApi } from '../api/paymentApi';

const PaymentSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const orderId = searchParams.get('orderId');
  const paymentKey = searchParams.get('paymentKey');
  const amount = searchParams.get('amount');
  const chatRoomId = searchParams.get('chatRoomId');
  const rentalHisId = searchParams.get('rentalHisId');

  // 상태 관리
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [error, setError] = useState(null);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRY = 1; // 최대 1번 재시도

  useEffect(() => {
    // 환경 변수 확인 로그
    const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY?.trim();
    console.log('[PaymentSuccessPage] VITE_TOSS_CLIENT_KEY 확인:', {
      exists: !!import.meta.env.VITE_TOSS_CLIENT_KEY,
      value: clientKey ? `${clientKey.substring(0, 15)}...` : 'undefined',
      length: clientKey?.length || 0,
      urlParams: { paymentKey, orderId, amount }
    });

    // 결제 승인 API 호출
    const confirmPayment = async () => {
      // 필수 파라미터 검증
      if (!paymentKey || !orderId || !amount) {
        console.error('[PaymentSuccessPage] 필수 파라미터 누락:', { paymentKey, orderId, amount });
        setError('결제 정보가 올바르지 않습니다. (paymentKey, orderId, amount 필요)');
        setStatus('error');
        return;
      }

      try {
        setStatus('loading');

        const confirmData = {
          orderId: orderId,
          paymentKey: paymentKey,
          amount: parseInt(amount)
        };

        console.log('[PaymentSuccessPage] 결제 승인 요청:', confirmData);

        // 백엔드 API 호출
        const response = await paymentApi.confirmPayment(confirmData);

        console.log('[PaymentSuccessPage] 결제 승인 완료:', response);

        setPaymentInfo(response);
        setStatus('success');
      } catch (error) {
        console.error('[PaymentSuccessPage] 결제 승인 실패:', error);

        // 에러 메시지 추출
        const errorMessage = error.response?.data?.message
          || error.response?.data?.error
          || error.message
          || '결제 승인 중 오류가 발생했습니다.';

        // "이미 처리된 결제" 에러 감지
        const isAlreadyProcessed = errorMessage.includes('이미') ||
                                   errorMessage.includes('ALREADY') ||
                                   errorMessage.includes('중복');

        if (isAlreadyProcessed && retryCount < MAX_RETRY) {
          console.warn('[PaymentSuccessPage] 이미 처리된 결제 감지 - 페이지 새로고침 시도');
          setRetryCount(prev => prev + 1);

          // 3초 후 페이지 새로고침 (토스 API 조회 재시도)
          setTimeout(() => {
            window.location.reload();
          }, 3000);

          setError('이미 처리된 결제입니다. 잠시 후 다시 확인합니다...');
          return;
        }

        setError(errorMessage);
        setStatus('error');
      }
    };

    confirmPayment();
  }, [paymentKey, orderId, amount, retryCount]);

  const formatCurrency = (value) => {
    if (!value) return '0원';
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(parseInt(value));
  };

  const handleGoToChats = () => {
    console.log('[PaymentSuccessPage] handleGoToChats 함수 실행됨!');
    console.log('[PaymentSuccessPage] URL 파라미터 값:', {
      chatRoomId,
      rentalHisId,
      orderId,
      amount
    });

    // 채팅방 ID가 있으면 해당 채팅방으로, 없으면 채팅 목록으로
    if (chatRoomId) {
      const url = `/chats/${chatRoomId}?paymentComplete=true&rentalHisId=${rentalHisId}&orderId=${orderId}&amount=${amount}`;
      console.log('[PaymentSuccessPage] 채팅방으로 이동:', {
        chatRoomId,
        rentalHisId,
        orderId,
        amount,
        url
      });
      navigate(url);
    } else {
      console.log('[PaymentSuccessPage] 채팅방 목록으로 이동 (chatRoomId 없음)');
      navigate('/chats');
    }
  };

  const handleGoToMyPage = () => {
    navigate('/mypage');
  };

  const handleGoToHome = () => {
    navigate('/');
  };

  const handleRetry = async () => {
    // 페이지 새로고침으로 간단히 재시도
    window.location.reload();
  };

  const handleRetryNewPayment = () => {
    // 채팅방으로 돌아가서 결제 다시 시작
    // orderId에서 rentalHisId 추출 (예: JOYING_3_xxx → rentalHisId=3)
    if (orderId) {
      const match = orderId.match(/JOYING_(\d+)_/);
      if (match) {
        const rentalHisId = match[1];
        // 채팅방 목록으로 이동 (또는 해당 채팅방으로 직접 이동)
        navigate('/chats');
        return;
      }
    }
    // orderId 파싱 실패 시 홈으로
    navigate('/');
  };

  // 로딩 중
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          {/* 로딩 스피너 */}
          <div className="mx-auto flex items-center justify-center h-16 w-16 mb-6">
            <svg className="animate-spin h-12 w-12 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            결제 승인 처리 중...
          </h1>

          <p className="text-gray-600 mb-6">
            잠시만 기다려주세요.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-800">
              <p>결제가 완료되었습니다.</p>
              <p className="mt-2">서버에서 결제를 승인하고 있습니다.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 에러 발생
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          {/* 에러 아이콘 */}
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
            <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            결제 승인 실패
          </h1>

          <p className="text-gray-600 mb-6">
            결제 승인 중 문제가 발생했습니다.
          </p>

          {/* 에러 메시지 */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-600">{error}</p>
          </div>

          {/* 결제 정보 */}
          {(orderId || paymentKey || amount) && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <div className="text-sm text-gray-600 mb-2">결제 정보</div>
              {orderId && (
                <div className="text-xs text-gray-500 mb-1">
                  주문번호: {orderId}
                </div>
              )}
              {paymentKey && (
                <div className="text-xs text-gray-500 mb-1">
                  결제 키: {paymentKey.substring(0, 20)}...
                </div>
              )}
              {amount && (
                <div className="text-lg font-semibold text-gray-900 mt-2">
                  {formatCurrency(amount)}
                </div>
              )}
            </div>
          )}

          {/* 안내 메시지 */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="text-sm text-yellow-800">
                <div className="font-medium mb-1">결제는 완료되었으나 승인에 실패했습니다</div>
                <div>잠시 후 다시 시도하거나, 고객센터로 문의해주세요.</div>
                <div className="mt-2 text-xs">
                  주문번호를 메모해두시면 문의 시 도움이 됩니다.
                </div>
              </div>
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="space-y-3">
            <button
              onClick={handleRetry}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700"
            >
              다시 시도
            </button>

            <button
              onClick={handleGoToHome}
              className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50"
            >
              홈으로 이동
            </button>
          </div>

          {/* 고객센터 정보 */}
          <div className="mt-6 text-xs text-gray-500">
            <p>고객센터: 1588-0000 (운영시간: 09:00 - 18:00)</p>
          </div>
        </div>
      </div>
    );
  }

  // 성공
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {/* 성공 아이콘 */}
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
          <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* 성공 메시지 */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          결제가 완료되었습니다!
        </h1>

        <p className="text-gray-600 mb-6">
          안전하게 결제가 처리되었습니다.
        </p>

        {/* 결제 정보 */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="text-sm text-gray-600 mb-3">결제 정보</div>
          {paymentInfo?.orderId && (
            <div className="text-xs text-gray-500 mb-1">
              주문번호: {paymentInfo.orderId}
            </div>
          )}
          {paymentInfo?.paymentKey && (
            <div className="text-xs text-gray-500 mb-2">
              결제 키: {paymentInfo.paymentKey.substring(0, 20)}...
            </div>
          )}
          {(paymentInfo?.totalAmount || amount) && (
            <div className="text-2xl font-bold text-blue-600 mt-2">
              {formatCurrency(paymentInfo?.totalAmount || amount)}
            </div>
          )}
        </div>

        {/* 안내 메시지 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-blue-800 text-left">
              <div className="font-medium mb-1">다음 단계</div>
              <div>대여자와 채팅을 통해 대여 일정을 조율해주세요.</div>
              <div className="mt-2">결제 영수증은 마이페이지에서 확인할 수 있습니다.</div>
            </div>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="space-y-3">
          <button
            onClick={handleGoToChats}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            채팅방으로 이동
          </button>

          <button
            onClick={handleGoToMyPage}
            className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-700 transition-colors"
          >
            마이페이지로 이동
          </button>

          <button
            onClick={handleGoToHome}
            className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            홈으로 이동
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
