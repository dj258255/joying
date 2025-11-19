/**
 * PaymentCheckoutPage Component
 * 결제 체크아웃 페이지 컴포넌트
 */

import React, { useState } from 'react';
import { usePayment } from '../hooks/usePayment';

const PaymentCheckoutPage = () => {
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    method: 'card',
    productId: '',
    rentalPeriod: ''
  });

  const { createPayment, isCreating } = usePayment();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const result = await createPayment(paymentData);
      // TODO: 결제 성공 페이지로 이동
      
    } catch (error) {
      
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8">
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-6">결제</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              결제 금액
            </label>
            <input
              type="number"
              value={paymentData.amount}
              onChange={(e) => setPaymentData(prev => ({
                ...prev,
                amount: parseInt(e.target.value)
              }))}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              결제 방법
            </label>
            <select
              value={paymentData.method}
              onChange={(e) => setPaymentData(prev => ({
                ...prev,
                method: e.target.value
              }))}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="card">카드</option>
              <option value="bank">계좌이체</option>
              <option value="kakao">카카오페이</option>
            </select>
          </div>
          
          <button
            type="submit"
            disabled={isCreating}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            {isCreating ? '결제 중...' : '결제하기'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PaymentCheckoutPage;
