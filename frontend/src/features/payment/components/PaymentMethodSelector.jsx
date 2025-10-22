/**
 * PaymentMethodSelector Component
 * 결제 방법 선택 컴포넌트
 */

import React from 'react';

/**
 * @param {Object} props
 * @param {string} props.selectedMethod - 선택된 결제 방법
 * @param {Function} props.onMethodChange - 결제 방법 변경 핸들러
 * @param {boolean} props.disabled - 비활성화 여부
 */
const PaymentMethodSelector = ({ 
  selectedMethod, 
  onMethodChange, 
  disabled = false 
}) => {
  const paymentMethods = [
    {
      id: 'card',
      name: '신용카드',
      icon: '💳',
      description: 'VISA, MasterCard, AMEX'
    },
    {
      id: 'bank',
      name: '계좌이체',
      icon: '🏦',
      description: '실시간 계좌이체'
    },
    {
      id: 'kakao',
      name: '카카오페이',
      icon: '💛',
      description: '카카오페이 간편결제'
    },
    {
      id: 'paypal',
      name: 'PayPal',
      icon: '🌐',
      description: 'PayPal 글로벌 결제'
    }
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-gray-900">결제 방법 선택</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {paymentMethods.map((method) => (
          <label
            key={method.id}
            className={`
              relative flex items-center p-4 border rounded-lg cursor-pointer transition-colors
              ${selectedMethod === method.id 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <input
              type="radio"
              name="paymentMethod"
              value={method.id}
              checked={selectedMethod === method.id}
              onChange={(e) => onMethodChange(e.target.value)}
              disabled={disabled}
              className="sr-only"
            />
            
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{method.icon}</span>
              <div>
                <div className="font-medium text-gray-900">{method.name}</div>
                <div className="text-sm text-gray-600">{method.description}</div>
              </div>
            </div>
            
            {selectedMethod === method.id && (
              <div className="absolute top-2 right-2">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </label>
        ))}
      </div>
    </div>
  );
};

export default PaymentMethodSelector;
