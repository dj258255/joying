/**
 * AccountVerifyForm Component
 * 계좌 인증 폼 컴포넌트
 */

import React, { useState } from 'react';
import { useAccountVerify } from '../hooks/useAccountVerify';

const AccountVerifyForm = () => {
  const [formData, setFormData] = useState({
    bankName: '',
    accountNumber: '',
    accountHolder: ''
  });
  
  const { verifyAccount, isLoading } = useAccountVerify();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await verifyAccount(formData);
      alert('계좌 인증이 완료되었습니다.');
    } catch (error) {
      alert('계좌 인증에 실패했습니다.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          은행명
        </label>
        <input
          type="text"
          name="bankName"
          value={formData.bankName}
          onChange={handleInputChange}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">
          계좌번호
        </label>
        <input
          type="text"
          name="accountNumber"
          value={formData.accountNumber}
          onChange={handleInputChange}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">
          예금주명
        </label>
        <input
          type="text"
          name="accountHolder"
          value={formData.accountHolder}
          onChange={handleInputChange}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
          required
        />
      </div>
      
      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50"
      >
        {isLoading ? '인증 중...' : '계좌 인증'}
      </button>
    </form>
  );
};

export default AccountVerifyForm;
