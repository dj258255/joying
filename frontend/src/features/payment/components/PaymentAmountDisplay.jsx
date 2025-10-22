/**
 * PaymentAmountDisplay Component
 * 결제 금액 표시 컴포넌트
 */

import React from 'react';

/**
 * @param {Object} props
 * @param {number} props.amount - 결제 금액
 * @param {number} props.discount - 할인 금액
 * @param {number} props.tax - 세금
 * @param {number} props.total - 총 결제 금액
 * @param {string} props.currency - 통화 (기본: KRW)
 */
const PaymentAmountDisplay = ({ 
  amount, 
  discount = 0, 
  tax = 0, 
  total, 
  currency = 'KRW' 
}) => {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: currency
    }).format(value);
  };

  const calculatedTotal = amount - discount + tax;

  return (
    <div className="bg-gray-50 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">결제 금액</h3>
      
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-600">상품 금액</span>
          <span className="font-medium">{formatCurrency(amount)}</span>
        </div>
        
        {discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>할인</span>
            <span>-{formatCurrency(discount)}</span>
          </div>
        )}
        
        {tax > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-600">세금</span>
            <span className="font-medium">{formatCurrency(tax)}</span>
          </div>
        )}
        
        <div className="border-t pt-3">
          <div className="flex justify-between text-lg font-bold">
            <span>총 결제 금액</span>
            <span className="text-blue-600">
              {formatCurrency(total || calculatedTotal)}
            </span>
          </div>
        </div>
      </div>
      
      {discount > 0 && (
        <div className="mt-4 p-3 bg-green-50 rounded-md">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-green-800 text-sm">
              {formatCurrency(discount)} 할인 적용됨
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentAmountDisplay;
