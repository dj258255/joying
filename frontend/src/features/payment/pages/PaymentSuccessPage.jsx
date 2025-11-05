/**
 * PaymentSuccessPage Component
 * 결제 성공 페이지 컴포넌트
 */

import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { paymentApi } from '../api/paymentApi';

const PaymentSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const orderId = searchParams.get('orderId');
  const paymentKey = searchParams.get('paymentKey');
  const amount = searchParams.get('amount');

  useEffect(() => {
    // 결제 승인 API 호출 (paymentKey가 있을 때만)
    if (paymentKey && orderId) {
      const confirmPayment = async () => {
        try {
          // 토스 페이먼츠에서 리다이렉트할 때 전달하는 파라미터 확인
          // 일반적으로 paymentKey, orderId, amount가 전달됨
          const confirmData = {
            orderId: orderId,
            paymentKey: paymentKey,
            amount: amount ? parseInt(amount) : undefined
          };

          console.log('[PaymentSuccessPage] 결제 승인 요청:', confirmData);
          
          await paymentApi.confirmPayment(confirmData);
          console.log('[PaymentSuccessPage] 결제 승인 완료');
        } catch (error) {
          console.error('[PaymentSuccessPage] 결제 승인 실패:', error);
          // 에러 발생 시 사용자에게 알림 (필요시)
          alert(`결제 승인 중 오류가 발생했습니다: ${error.response?.data?.message || error.message}`);
        }
      };

      confirmPayment();
    } else {
      console.warn('[PaymentSuccessPage] paymentKey 또는 orderId가 없습니다:', { paymentKey, orderId });
    }
  }, [paymentKey, orderId, amount]);

  const formatCurrency = (value) => {
    if (!value) return '0원';
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(parseInt(value));
  };

  const handleGoToMyPage = () => {
    navigate('/mypage');
  };

  const handleGoToHome = () => {
    navigate('/');
  };

  const handleGoToChat = () => {
    // 채팅방으로 돌아가기 (orderId를 이용해 채팅방 찾기)
    // TODO: orderId로 채팅방 ID 찾기
    navigate('/chats');
  };

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
            <div className="text-lg font-semibold text-gray-900">
              {formatCurrency(amount)}
            </div>
          )}
        </div>

        {/* 안내 메시지 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-blue-800">
              <div className="font-medium mb-1">다음 단계</div>
              <div>대여자와 채팅을 통해 대여 일정을 조율해주세요.</div>
            </div>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="space-y-3">
          <button
            onClick={handleGoToMyPage}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700"
          >
            마이페이지로 이동
          </button>
          
          <button
            onClick={handleGoToHome}
            className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50"
          >
            홈으로 이동
          </button>
        </div>

        {/* 추가 정보 */}
        <div className="mt-6 text-xs text-gray-500">
          <p>결제 관련 문의사항이 있으시면 고객센터로 연락해주세요.</p>
          <p>고객센터: 1588-0000</p>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
