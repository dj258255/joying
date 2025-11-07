/**
 * Rental API Test Page
 * 대여 거래 생성 API 테스트 페이지
 */

import React, { useState } from 'react';
import { rentalApi } from '../api/rentalApi';

const RentalApiTestPage = () => {
  const [productId, setProductId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [rentMethod, setRentMethod] = useState('BOTH');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // 현재 시간 기준으로 기본 날짜 설정
  const getDefaultStartDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 1); // 내일
    return date.toISOString().slice(0, 16);
  };

  const getDefaultEndDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 3); // 3일 후
    return date.toISOString().slice(0, 16);
  };

  const handleTest = async () => {
    if (!productId) {
      setError('상품 ID를 입력해주세요.');
      return;
    }

    if (!startDate || !endDate) {
      setError('대여 시작일과 종료일을 모두 입력해주세요.');
      return;
    }

    if (new Date(startDate) >= new Date(endDate)) {
      setError('종료일은 시작일보다 이후여야 합니다.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // datetime-local 입력값을 ISO-8601 형식으로 변환
      // datetime-local은 "YYYY-MM-DDTHH:mm" 형식이며, 로컬 시간대로 해석됨
      // 백엔드는 ISO-8601 형식 (예: "2025-11-01T23:24:15.354Z")을 기대함
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      
      // ISO 문자열로 변환 (밀리초 포함)
      const startRenISO = startDateObj.toISOString();
      const endRenISO = endDateObj.toISOString();

      const rentalData = {
        startRen: startRenISO,
        endRen: endRenISO,
        rentMethod: rentMethod
      };

      // 요청 본문 상세 로그
      console.log('📤 API 요청 상세:', {
        url: `/rentals/${productId}/reservations`,
        method: 'POST',
        body: rentalData,
        'body (JSON string)': JSON.stringify(rentalData),
        'startDate (input)': startDate,
        'endDate (input)': endDate,
        'startRen (ISO)': startRenISO,
        'endRen (ISO)': endRenISO
      });

      const response = await rentalApi.createRentalReservation(productId, rentalData);

      console.log('✅ API 응답:', response);
      setResult(response);
    } catch (err) {
      console.error('❌ API 에러:', err);
      setError({
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        statusText: err.response?.statusText
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefaultDates = () => {
    setStartDate(getDefaultStartDate());
    setEndDate(getDefaultEndDate());
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            대여 거래 생성 API 테스트
          </h1>

          <div className="space-y-4">
            {/* 상품 ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                상품 ID (productId) *
              </label>
              <input
                type="text"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                placeholder="예: 1, 2, 3..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* 대여 시작일 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                대여 시작일 (startRen) *
              </label>
              <div className="flex gap-2">
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={handleSetDefaultDates}
                  className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  기본값 설정
                </button>
              </div>
            </div>

            {/* 대여 종료일 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                대여 종료일 (endRen) *
              </label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* 대여 방법 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                대여 방법 (rentMethod) *
              </label>
              <select
                value={rentMethod}
                onChange={(e) => setRentMethod(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="DELIVERY">배송 (DELIVERY)</option>
                <option value="MEET">직접 만나기 (MEET)</option>
                <option value="BOTH">둘 다 가능 (BOTH)</option>
              </select>
            </div>

            {/* 테스트 버튼 */}
            <button
              onClick={handleTest}
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '요청 중...' : 'API 테스트 실행'}
            </button>
          </div>

          {/* 에러 표시 */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <h3 className="text-lg font-semibold text-red-800 mb-2">에러 발생</h3>
              <div className="text-sm text-red-700 space-y-1">
                <p><strong>메시지:</strong> {error.message}</p>
                {error.status && (
                  <p><strong>상태 코드:</strong> {error.status} {error.statusText}</p>
                )}
                {error.response && (
                  <details className="mt-2">
                    <summary className="cursor-pointer font-medium">응답 상세 보기</summary>
                    <pre className="mt-2 p-2 bg-red-100 rounded text-xs overflow-auto">
                      {JSON.stringify(error.response, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          )}

          {/* 결과 표시 */}
          {result && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
              <h3 className="text-lg font-semibold text-green-800 mb-2">✅ 성공!</h3>
              <div className="text-sm text-green-700 space-y-2">
                <div>
                  <strong>상태:</strong> {result.status} - {result.message}
                </div>
                {result.data && (
                  <details className="mt-2">
                    <summary className="cursor-pointer font-medium">응답 데이터 보기</summary>
                    <pre className="mt-2 p-2 bg-green-100 rounded text-xs overflow-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </details>
                )}
                <div className="mt-2 p-2 bg-white rounded border border-green-200">
                  <p className="font-medium mb-1">생성된 대여 정보:</p>
                  {result.data && (
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li><strong>대여이력 ID:</strong> {result.data.rentalHisId}</li>
                      <li><strong>상품 ID:</strong> {result.data.productId}</li>
                      <li><strong>상태:</strong> {result.data.status}</li>
                      <li><strong>대여요금:</strong> {result.data.fee?.toLocaleString()}원</li>
                      <li><strong>보증금:</strong> {result.data.deposit?.toLocaleString()}원</li>
                      <li><strong>결제 총액:</strong> {result.data.totalAmount?.toLocaleString()}원</li>
                      <li><strong>시작일:</strong> {new Date(result.data.startRen).toLocaleString('ko-KR')}</li>
                      <li><strong>종료일:</strong> {new Date(result.data.endRen).toLocaleString('ko-KR')}</li>
                      {result.data.message && (
                        <li><strong>안내:</strong> {result.data.message}</li>
                      )}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 요청 본문 미리보기 */}
          {startDate && endDate && productId && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h3 className="text-sm font-semibold text-blue-800 mb-2">요청 본문 미리보기</h3>
              <pre className="text-xs text-blue-700 overflow-auto bg-white p-2 rounded border border-blue-200">
                {JSON.stringify({
                  startRen: new Date(startDate).toISOString(),
                  endRen: new Date(endDate).toISOString(),
                  rentMethod: rentMethod
                }, null, 2)}
              </pre>
            </div>
          )}

          {/* API 정보 */}
          <div className="mt-6 p-4 bg-gray-50 rounded-md">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">API 정보</h3>
            <div className="text-xs text-gray-600 space-y-1">
              <p><strong>엔드포인트:</strong> POST /rentals/{'{productId}'}/reservations</p>
              <p><strong>인증:</strong> Bearer Token (자동 적용)</p>
              <p><strong>요청 형식:</strong> JSON</p>
              <p className="mt-2 text-red-600"><strong>⚠️ 문제 해결 팁:</strong></p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li>브라우저 개발자 도구(F12) → Network 탭에서 실제 요청 확인</li>
                <li>Console 탭에서 상세 로그 확인</li>
                <li>요청 본문이 올바른 JSON 형식인지 확인</li>
                <li>날짜 형식이 ISO-8601 형식인지 확인</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RentalApiTestPage;

