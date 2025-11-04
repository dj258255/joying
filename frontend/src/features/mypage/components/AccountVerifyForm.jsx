/**
 * AccountVerifyForm Component
 * 1원 인증 계좌 인증 폼 컴포넌트
 */

import React, { useState } from 'react';
import { accountApi } from '@/features/user/api/accountApi';
import { FiShield, FiCheck, FiX, FiAlertCircle, FiLoader } from 'react-icons/fi';

const AccountVerifyForm = () => {
  const [step, setStep] = useState(1); // 1: 계좌번호 입력, 2: 인증 코드 입력, 3: 완료
  const [accountNo, setAccountNo] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [transactionUniqueNo, setTransactionUniqueNo] = useState('');
  const [verifiedAccount, setVerifiedAccount] = useState(null);

  // 계좌번호 입력 후 1원 인증 시작
  const handleStartVerification = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!accountNo || accountNo.trim().length < 10) {
      setError('올바른 계좌번호를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const data = await accountApi.startVerification({
        accountNo: accountNo.trim()
      });

      // 응답 구조 확인
      setTransactionUniqueNo(data.transactionUniqueNo || '');
      setStep(2); // 인증 코드 입력 단계로 이동
    } catch (err) {
      console.error('1원 인증 시작 실패:', err);
      setError(
        err?.response?.data?.message || 
        err?.response?.data?.error || 
        '1원 인증 시작에 실패했습니다. 계좌번호를 확인해주세요.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 인증 코드 입력 후 인증 완료
  const handleCompleteVerification = async (e) => {
    e.preventDefault();
    setError('');

    if (!authCode || authCode.trim().length !== 4) {
      setError('4자리 인증 코드를 입력해주세요.');
      return;
    }

    if (!accountHolderName || accountHolderName.trim().length < 2) {
      setError('예금주명을 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const data = await accountApi.completeVerification({
        accountNo: accountNo.trim(),
        authCode: authCode.trim(),
        accountHolderName: accountHolderName.trim()
      });

      // 응답 구조 확인
      setVerifiedAccount({
        accountNo: data.accountNo || accountNo,
        realName: data.realName || accountHolderName,
        verified: data.verified || true
      });
      setStep(3); // 완료 단계로 이동
    } catch (err) {
      console.error('1원 인증 완료 실패:', err);
      setError(
        err?.response?.data?.message || 
        err?.response?.data?.error || 
        '인증 코드가 올바르지 않습니다. 다시 확인해주세요.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 계좌번호 입력 핸들러 (숫자만 허용)
  const handleAccountNoChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setAccountNo(value);
    setError('');
  };

  // 인증 코드 입력 핸들러 (숫자만, 최대 4자리)
  const handleAuthCodeChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
    setAuthCode(value);
    setError('');
  };

  // 다시 시작
  const handleReset = () => {
    setStep(1);
    setAccountNo('');
    setAccountHolderName('');
    setAuthCode('');
    setError('');
    setTransactionUniqueNo('');
    setVerifiedAccount(null);
  };

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-4 lg:mb-6">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <FiShield className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-xl lg:text-2xl font-bold text-gray-900">계좌 1원 인증</h2>
        </div>
        <p className="text-gray-600 text-sm lg:text-base ml-13">
          계좌번호를 입력하고 1원 입금으로 계좌를 인증하세요
        </p>
      </div>

      {/* Step 1: 계좌번호 입력 */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 lg:p-8 shadow-sm">
          <form onSubmit={handleStartVerification} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                계좌번호 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={accountNo}
                onChange={handleAccountNoChange}
                placeholder="계좌번호를 입력하세요 (하이픈 제외)"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                maxLength={20}
                required
              />
              <p className="text-xs text-gray-500 mt-2">
                하이픈(-) 없이 숫자만 입력해주세요. 예: 0041234567890123
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start space-x-3">
                <FiAlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center space-x-2">
                <FiShield className="w-4 h-4" />
                <span>1원 인증 안내</span>
              </h4>
              <ul className="text-sm text-blue-800 space-y-1.5">
                <li>• 입력하신 계좌로 1원이 입금됩니다</li>
                <li>• 입금자명에 표시된 4자리 인증 코드를 확인하세요</li>
                <li>• 인증 코드는 5분 이내에 입력해야 합니다</li>
                <li>• 인증 완료 후 대여 수익을 받을 수 있습니다</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={isLoading || !accountNo || accountNo.length < 10}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <FiLoader className="w-5 h-5 animate-spin" />
                  <span>인증 시작 중...</span>
                </>
              ) : (
                <span>1원 인증 시작</span>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Step 2: 인증 코드 입력 */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 lg:p-8 shadow-sm">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-sm">1</span>
                </div>
                <span className="text-gray-400">/</span>
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">2</span>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              인증 코드 입력
            </h3>
            <p className="text-sm text-gray-600">
              계좌로 입금된 1원의 입금자명에 표시된 4자리 코드를 입력하세요
            </p>
          </div>

          <form onSubmit={handleCompleteVerification} className="space-y-6">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="text-sm text-gray-600 mb-1">입력한 계좌번호</div>
              <div className="text-lg font-semibold text-gray-900">{accountNo}</div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                예금주명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={accountHolderName}
                onChange={(e) => {
                  setAccountHolderName(e.target.value);
                  setError('');
                }}
                placeholder="예금주명을 입력하세요"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                인증 코드 (4자리) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={authCode}
                onChange={handleAuthCodeChange}
                placeholder="1234"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-2xl font-mono text-center tracking-widest focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                maxLength={4}
                required
              />
              <p className="text-xs text-gray-500 mt-2">
                입금자명에 표시된 4자리 숫자를 입력하세요
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start space-x-3">
                <FiAlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <p className="text-sm text-yellow-800">
                <FiAlertCircle className="w-4 h-4 inline mr-2" />
                인증 코드는 5분 이내에 입력해야 합니다. 시간이 지나면 다시 시작해주세요.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-semibold hover:bg-gray-200 transition-all"
              >
                다시 시작
              </button>
              <button
                type="submit"
                disabled={isLoading || !authCode || authCode.length !== 4 || !accountHolderName}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <FiLoader className="w-5 h-5 animate-spin" />
                    <span>인증 중...</span>
                  </>
                ) : (
                  <span>인증 완료</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Step 3: 인증 완료 */}
      {step === 3 && verifiedAccount && (
        <div className="bg-white rounded-2xl border border-green-200 p-6 lg:p-8 shadow-sm">
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiCheck className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">계좌 인증 완료</h3>
            <p className="text-gray-600 mb-8">계좌 인증이 성공적으로 완료되었습니다.</p>

            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 text-left max-w-md mx-auto">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                  <span className="text-sm text-gray-600">계좌번호</span>
                  <span className="text-sm font-semibold text-gray-900">{verifiedAccount.accountNo}</span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                  <span className="text-sm text-gray-600">예금주</span>
                  <span className="text-sm font-semibold text-gray-900">{verifiedAccount.realName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">인증 상태</span>
                  <span className="inline-flex items-center space-x-2">
                    <FiCheck className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-semibold text-green-600">인증됨</span>
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="mt-8 bg-blue-600 text-white py-3 px-8 rounded-xl font-semibold hover:bg-blue-700 transition-all"
            >
              다른 계좌 인증하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountVerifyForm;
