/**
 * AccountTransactionPage Component
 * 계좌 거래 내역 조회 페이지 (1원 인증 코드 확인용)
 * 
 * URL 파라미터로 accountNo와 transactionUniqueNo를 받아서 자동으로 조회
 * 예: /accounts/transactions?accountNo=0041234567890123&transactionUniqueNo=7
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { accountApi } from '@/features/user/api/accountApi';
import SideNavbar from '@/shared/components/Navbar/SideNavbar';

const AccountTransactionPage = () => {
  const [searchParams] = useSearchParams();
  const [transactionData, setTransactionData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const accountNo = searchParams.get('accountNo');
  const transactionUniqueNo = searchParams.get('transactionUniqueNo');

  useEffect(() => {
    const fetchTransactionHistory = async () => {
      if (!accountNo || !transactionUniqueNo) {
        setError('계좌번호와 거래 고유번호가 필요합니다.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        const response = await accountApi.getTransactionHistory({
          accountNo: accountNo,
          transactionUniqueNo: transactionUniqueNo
        });
        
        setTransactionData(response);
      } catch (err) {
        console.error('[AccountTransactionPage] 거래 내역 조회 실패:', err);
        let errorMessage = '거래 내역 조회에 실패했습니다.';
        
        if (err.response?.data) {
          const errorData = err.response.data;
          if (errorData.code === 'C007') {
            errorMessage = '서버 오류가 발생했습니다. SSAFY 금융망 API 호출에 실패했을 수 있습니다.';
          } else {
            errorMessage = errorData.message || errorMessage;
          }
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactionHistory();
  }, [accountNo, transactionUniqueNo]);

  return (
    <>
      <SideNavbar />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">거래 내역 조회</h1>
                <p className="text-gray-600 text-sm sm:text-base">1원 인증 코드 확인</p>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
                <p className="text-gray-600">거래 내역을 조회하는 중...</p>
              </div>
            ) : error ? (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h3 className="text-sm font-semibold text-red-900 mb-1">조회 실패</h3>
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  </div>
                </div>

                {/* 입력된 파라미터 표시 */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">요청 정보</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">계좌번호: </span>
                      <span className="font-mono text-gray-900">{accountNo || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">거래 고유번호: </span>
                      <span className="font-mono text-gray-900">{transactionUniqueNo || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* 안내 메시지 */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2">안내</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• SSAFY 금융망 API 호출에 실패했을 수 있습니다</li>
                    <li>• 계좌번호와 거래 고유번호를 확인해주세요</li>
                    <li>• 잠시 후 다시 시도해주세요</li>
                    <li>• 1원 인증 시작 후 바로 조회하면 거래 내역이 아직 반영되지 않았을 수 있습니다</li>
                  </ul>
                </div>
              </div>
            ) : transactionData ? (
              <div className="space-y-6">
                {/* 계좌 정보 헤더 */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm opacity-90 mb-1">계좌번호</p>
                      <p className="text-lg font-mono font-semibold">{accountNo}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm opacity-90 mb-1">거래 고유번호</p>
                      <p className="text-base font-mono">{transactionUniqueNo}</p>
                    </div>
                  </div>
                </div>

                {/* 거래 내역 카드 (실제 계좌 거래 내역 스타일) */}
                <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-gray-50 border-b-2 border-gray-200 px-6 py-4">
                    <h2 className="text-lg font-bold text-gray-900">거래 내역</h2>
                  </div>
                  
                  <div className="p-6 space-y-5">
                    {/* 거래 일시 */}
                    <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                      <span className="text-sm font-medium text-gray-600">거래 일시</span>
                      <span className="text-base font-semibold text-gray-900">
                        {transactionData.transactionDate ? 
                          `${transactionData.transactionDate.substring(0, 4)}.${transactionData.transactionDate.substring(4, 6)}.${transactionData.transactionDate.substring(6, 8)}` 
                          : '-'} 
                        {transactionData.transactionTime ? 
                          ` ${transactionData.transactionTime.substring(0, 2)}:${transactionData.transactionTime.substring(2, 4)}:${transactionData.transactionTime.substring(4, 6)}` 
                          : ''}
                      </span>
                    </div>

                    {/* 거래 구분 */}
                    <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                      <span className="text-sm font-medium text-gray-600">거래 구분</span>
                      <span className={`text-base font-semibold px-3 py-1 rounded-full ${
                        transactionData.transactionTypeName === '입금' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {transactionData.transactionTypeName || '-'}
                      </span>
                    </div>

                    {/* 거래 금액 */}
                    <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                      <span className="text-sm font-medium text-gray-600">거래 금액</span>
                      <span className={`text-xl font-bold ${
                        transactionData.transactionTypeName === '입금' 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {transactionData.transactionBalance ? 
                          `${transactionData.transactionTypeName === '입금' ? '+' : '-'}${transactionData.transactionBalance.toLocaleString()}원` 
                          : '-'}
                      </span>
                    </div>

                    {/* 거래 후 잔액 */}
                    <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                      <span className="text-sm font-medium text-gray-600">거래 후 잔액</span>
                      <span className="text-lg font-semibold text-gray-900">
                        {transactionData.transactionAfterBalance ? 
                          `${transactionData.transactionAfterBalance.toLocaleString()}원` 
                          : '-'}
                      </span>
                    </div>

                    {/* 입금자명 (거래 요약) */}
                    <div className="flex items-center justify-between pb-4 border-b-2 border-gray-300">
                      <span className="text-sm font-medium text-gray-600">입금자명</span>
                      <span className="text-base font-semibold text-gray-900">
                        {transactionData.transactionSummary || '-'}
                      </span>
                    </div>

                    {/* 거래 메모 */}
                    {transactionData.transactionMemo && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">거래 메모</span>
                        <span className="text-sm text-gray-700">{transactionData.transactionMemo}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 인증 코드 강조 표시 */}
                {transactionData.authCode && (
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-6">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-full mb-4">
                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">인증 코드</h3>
                      <div className="text-5xl font-mono font-bold text-green-700 bg-white rounded-lg px-8 py-6 border-2 border-green-400 tracking-widest mb-3">
                        {transactionData.authCode}
                      </div>
                      <p className="text-sm text-gray-600">입금자명에 표시된 4자리 숫자를 입력하세요</p>
                    </div>
                  </div>
                )}

                {/* 안내 메시지 */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2">안내</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• 입금자명에 표시된 4자리 숫자가 인증 코드입니다</li>
                    <li>• 인증 코드는 5분 이내에 입력해주세요</li>
                    <li>• 인증 코드 입력 후 계좌 인증을 완료할 수 있습니다</li>
                  </ul>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
};

export default AccountTransactionPage;

