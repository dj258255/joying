/**
 * AccountVerifyForm Component
 * 계좌 인증 폼 컴포넌트
 */

import React, { useState } from 'react';

const AccountVerifyForm = () => {
  const [formData, setFormData] = useState({
    bankName: '',
    accountNumber: '',
    accountHolder: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    // 실제 API 호출 시뮬레이션
    setTimeout(() => {
      setIsLoading(false);
      setIsVerified(true);
      alert('계좌 인증이 완료되었습니다.');
    }, 2000);
  };

  const bankOptions = [
    '국민은행', '신한은행', '우리은행', '하나은행', '농협은행',
    '기업은행', '새마을금고', '신협', '우체국', '카카오뱅크', '토스뱅크'
  ];

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-4 lg:mb-6">
        <h2 className="text-xl lg:text-2xl font-bold text-gray-900">계좌 인증</h2>
        <p className="text-gray-600 mt-1 text-sm lg:text-base">대여 수익을 받기 위한 계좌 인증을 진행하세요</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 lg:p-6">
        {!isVerified ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 은행 선택 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                은행명 *
              </label>
              <select
                name="bankName"
                value={formData.bankName}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">은행을 선택하세요</option>
                {bankOptions.map((bank) => (
                  <option key={bank} value={bank}>{bank}</option>
                ))}
              </select>
            </div>

            {/* 계좌번호 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                계좌번호 *
              </label>
              <input
                type="text"
                name="accountNumber"
                value={formData.accountNumber}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="계좌번호를 입력하세요 (하이픈 제외)"
                required
              />
              <p className="text-xs text-gray-500 mt-1">하이픈(-) 없이 숫자만 입력해주세요</p>
            </div>

            {/* 예금주명 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                예금주명 *
              </label>
              <input
                type="text"
                name="accountHolder"
                value={formData.accountHolder}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="예금주명을 입력하세요"
                required
              />
              <p className="text-xs text-gray-500 mt-1">실명으로 입력해주세요</p>
            </div>

            {/* 인증 안내 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">계좌 인증 안내</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• 입력하신 계좌로 1원 이하의 인증금액이 입금됩니다</li>
                <li>• 입금된 금액을 확인 후 인증을 완료해주세요</li>
                <li>• 인증 완료 후 대여 수익을 받을 수 있습니다</li>
                <li>• 인증 정보는 안전하게 보관됩니다</li>
              </ul>
            </div>

            {/* 버튼 영역 */}
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? '인증 중...' : '계좌 인증'}
              </button>
              <button
                type="button"
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                취소
              </button>
            </div>
          </form>
        ) : (
          /* 인증 완료 상태 */
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
                  <span className="text-sm text-gray-600">은행:</span>
                  <span className="text-sm font-medium text-gray-900">{formData.bankName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">계좌번호:</span>
                  <span className="text-sm font-medium text-gray-900">{formData.accountNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">예금주:</span>
                  <span className="text-sm font-medium text-gray-900">{formData.accountHolder}</span>
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
