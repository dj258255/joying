/**
 * AccountVerifyForm Component
 * 계좌 인증 폼 컴포넌트 (1원 인증 2단계 프로세스)
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { accountApi } from '@/features/user/api/accountApi';
import { useAuth } from '@/features/auth/contexts/AuthContext';

const AccountVerifyForm = ({ onComplete }) => {
  const navigate = useNavigate();
  const { checkAuthStatus } = useAuth();
  
  // 1단계: 인증 시작
  const [step, setStep] = useState('start'); // 'start' | 'complete' | 'verified'
  const [formData, setFormData] = useState({
    accountNo: '',
    accountHolderName: ''
  });
  const [authCode, setAuthCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationData, setVerificationData] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // 계좌번호 입력 시 숫자만 허용하고 최대 16자리로 제한
    let processedValue = value;
    if (name === 'accountNo') {
      // 숫자만 추출하고 최대 16자리로 제한
      processedValue = value.replace(/[^0-9]/g, '').slice(0, 16);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));
    setError('');
  };

  const handleAuthCodeChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
    setAuthCode(value);
    setError('');
  };

  // 1단계: 인증 시작
  const handleStartVerification = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // 계좌번호 검증 (16자리 숫자)
    const accountNo = formData.accountNo.replace(/[^0-9]/g, '');
    if (accountNo.length !== 16) {
      setError('계좌번호는 16자리 숫자여야 합니다.');
      setIsLoading(false);
      return;
    }

    // 예금주명 검증
    if (!formData.accountHolderName || formData.accountHolderName.trim().length === 0) {
      setError('예금주명을 입력해주세요.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await accountApi.startVerification({
        accountNo: accountNo
      });
      
      setVerificationData(response);
      
      // 거래 내역 조회 페이지로 자동 이동
      const transactionUrl = `/accounts/transactions?accountNo=${encodeURIComponent(response.accountNo)}&transactionUniqueNo=${encodeURIComponent(response.transactionUniqueNo)}`;
      console.log('[AccountVerifyForm] 거래 내역 조회 페이지로 이동:', transactionUrl);
      
      // 새 창으로 거래 내역 페이지 열기 (인증 코드 확인용)
      window.open(transactionUrl, '_blank');
      
      setStep('complete');
    } catch (err) {
      let errorMessage = '인증 시작에 실패했습니다.';
      
      if (err.response?.data) {
        const errorData = err.response.data;
        if (errorData.code === 'AC006') {
          errorMessage = '계좌 인증에 실패했습니다. SSAFY 테스트 계좌인지 확인해주세요.';
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

  // 2단계: 인증 완료
  const handleCompleteVerification = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await accountApi.completeVerification({
        accountNo: formData.accountNo,
        authCode: authCode,
        accountHolderName: formData.accountHolderName
      });

      if (response.verified) {
        // 사용자 정보 새로고침 (인증 상태 업데이트)
        await checkAuthStatus();
        // 약간의 지연을 두어 상태 업데이트가 완료되도록 함
        setTimeout(() => {
          setStep('verified');
          if (onComplete) {
            onComplete();
          }
        }, 100);
      }
    } catch (err) {
      setError(err.response?.data?.message || '인증 코드가 일치하지 않습니다. 다시 확인해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">계좌 인증</h2>
            <p className="text-gray-600 mt-2 text-sm">대여 수익을 받기 위한 계좌 인증을 진행하세요</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/accounts/transactions')}
            className="ml-4 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors whitespace-nowrap flex-shrink-0"
          >
            테스트 계좌 생성
          </button>
        </div>
      </div>

      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 p-6">
        {step === 'start' && (
          <form onSubmit={handleStartVerification} className="space-y-6">
            {/* 계좌번호 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                계좌번호 * (16자리)
              </label>
              <input
                type="text"
                name="accountNo"
                value={formData.accountNo}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="계좌번호를 입력하세요 (하이픈 제외)"
                maxLength={16}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                하이픈(-) 없이 숫자만 입력해주세요 ({formData.accountNo.length}/16)
              </p>
            </div>

            {/* 예금주명 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                예금주명 *
              </label>
              <input
                type="text"
                name="accountHolderName"
                value={formData.accountHolderName}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="예금주명을 입력하세요"
                required
              />
              <p className="text-xs text-gray-500 mt-1">실명으로 입력해주세요</p>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* 인증 안내 */}
            <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">1원 인증 안내</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• 입력하신 계좌로 1원이 송금됩니다</li>
                <li>• 입금자명에 표시된 4자리 인증 코드를 확인해주세요</li>
                <li>• 인증 코드는 5분 이내에 입력해주세요</li>
                <li>• 인증 완료 후 대여 수익을 받을 수 있습니다</li>
              </ul>
            </div>

            {/* 버튼 영역 */}
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-gray-900 to-gray-800 text-white py-3 px-6 rounded-lg hover:from-black hover:to-gray-900 disabled:opacity-50 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
              >
                {isLoading ? '인증 중...' : '계좌 인증'}
              </button>
               <button
                 type="button"
                 onClick={() => navigate('/mypage', { state: { activeTab: 'account' } })}
                 className="flex-1 bg-white/80 text-gray-700 py-3 px-6 rounded-lg hover:bg-white transition-all duration-200 border border-gray-300 font-medium"
               >
                 취소
               </button>
            </div>
          </form>
        )}

        {step === 'complete' && (
          <form onSubmit={handleCompleteVerification} className="space-y-6">
            {/* 안내 메시지 */}
            <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-gray-700 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-1">1원이 송금되었습니다</h4>
                  <p className="text-sm text-gray-700">{verificationData?.message || '입금자명에 표시된 4자리 인증 코드를 입력해주세요.'}</p>
                </div>
              </div>
            </div>

            {/* 계좌번호 (읽기 전용) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                계좌번호
              </label>
              <input
                type="text"
                value={formData.accountNo}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 text-gray-500"
                readOnly
              />
            </div>

            {/* 예금주명 (읽기 전용) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                예금주명
              </label>
              <input
                type="text"
                value={formData.accountHolderName}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 text-gray-500"
                readOnly
              />
            </div>

            {/* 인증 코드 입력 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                인증 코드 (4자리) *
              </label>
              <input
                type="text"
                value={authCode}
                onChange={handleAuthCodeChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-center text-2xl tracking-widest"
                placeholder="0000"
                maxLength={4}
                required
              />
              <p className="text-xs text-gray-500 mt-1">입금자명에 표시된 4자리 숫자를 입력해주세요</p>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* 버튼 영역 */}
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={isLoading || authCode.length !== 4}
                className="flex-1 bg-gradient-to-r from-gray-900 to-gray-800 text-white py-3 px-6 rounded-lg hover:from-black hover:to-gray-900 disabled:opacity-50 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
              >
                {isLoading ? '인증 중...' : '인증 완료'}
              </button>
              <button
                type="button"
                onClick={() => setStep('start')}
                className="flex-1 bg-white/80 text-gray-700 py-3 px-6 rounded-lg hover:bg-white transition-all duration-200 border border-gray-300 font-medium"
              >
                다시 시작
              </button>
            </div>
          </form>
        )}

        {step === 'verified' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">계좌 인증 완료</h3>
            <p className="text-gray-600 mb-6">계좌 인증이 성공적으로 완료되었습니다.</p>
            <div className="bg-gray-50 rounded-lg p-4 text-left">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">계좌번호:</span>
                  <span className="text-sm font-medium text-gray-900">{formData.accountNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">예금주:</span>
                  <span className="text-sm font-medium text-gray-900">{formData.accountHolderName}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountVerifyForm;
