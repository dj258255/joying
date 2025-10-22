/**
 * PaymentFailPage Component
 * 결제 실패 페이지 컴포넌트
 */

import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const PaymentFailPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const errorCode = searchParams.get('errorCode');
  const errorMessage = searchParams.get('errorMessage');

  const getErrorMessage = (code) => {
    const errorMap = {
      'CARD_DECLINED': '카드 승인이 거절되었습니다.',
      'INSUFFICIENT_FUNDS': '잔액이 부족합니다.',
      'INVALID_CARD': '유효하지 않은 카드입니다.',
      'NETWORK_ERROR': '네트워크 오류가 발생했습니다.',
      'TIMEOUT': '결제 시간이 초과되었습니다.'
    };
    return errorMap[code] || '결제 처리 중 오류가 발생했습니다.';
  };

  const handleRetryPayment = () => {
    navigate('/payment/checkout');
  };

  const handleGoToHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {/* 실패 아이콘 */}
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
          <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>

        {/* 실패 메시지 */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          결제에 실패했습니다
        </h1>
        
        <p className="text-gray-600 mb-6">
          {errorMessage || getErrorMessage(errorCode)}
        </p>

        {/* 오류 정보 */}
        {errorCode && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="text-sm text-gray-600 mb-2">오류 정보</div>
            <div className="text-xs text-gray-500">
              오류 코드: {errorCode}
            </div>
          </div>
        )}

        {/* 해결 방법 안내 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-yellow-800">
              <div className="font-medium mb-1">해결 방법</div>
              <ul className="text-left space-y-1">
                <li>• 카드 정보를 다시 확인해주세요</li>
                <li>• 다른 결제 방법을 시도해보세요</li>
                <li>• 잠시 후 다시 시도해주세요</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="space-y-3">
          <button
            onClick={handleRetryPayment}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700"
          >
            다시 결제하기
          </button>
          
          <button
            onClick={handleGoToHome}
            className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50"
          >
            홈으로 이동
          </button>
        </div>

        {/* 고객센터 안내 */}
        <div className="mt-6 text-xs text-gray-500">
          <p>문제가 지속되면 고객센터로 연락해주세요.</p>
          <p>고객센터: 1588-0000</p>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailPage;
