/**
 * AccountVerifyPage Component
 * 계좌 인증 페이지 컴포넌트
 */

import React from 'react';
import AccountVerifyForm from '../components/AccountVerifyForm';

const AccountVerifyPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-md mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            계좌 인증
          </h1>
          <p className="text-gray-600 mb-6">
            대여 서비스 이용을 위해 계좌 인증이 필요합니다.
          </p>
          <AccountVerifyForm />
        </div>
      </div>
    </div>
  );
};

export default AccountVerifyPage;
