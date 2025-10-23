/**
 * ShippingStatusCard Component
 * 배송 상태 표시 카드 컴포넌트
 */

import React from 'react';

const ShippingStatusCard = ({ trackingNumber, courier, status, type = 'outbound' }) => {
  const statusMap = {
    PENDING: { label: '집화 대기', color: 'gray', progress: 20 },
    COLLECTED: { label: '집화 완료', color: 'blue', progress: 40 },
    IN_TRANSIT: { label: '배송 중', color: 'blue', progress: 60 },
    OUT_FOR_DELIVERY: { label: '배송 출발', color: 'green', progress: 80 },
    DELIVERED: { label: '배송 완료', color: 'green', progress: 100 }
  };

  const currentStatus = statusMap[status] || statusMap.PENDING;
  const courierMap = {
    cj: 'CJ대한통운',
    post: '우체국택배',
    lotte: '롯데택배',
    hanjin: '한진택배',
    logen: '로젠택배'
  };

  const steps = [
    { key: 'PENDING', label: '집화 대기' },
    { key: 'COLLECTED', label: '집화 완료' },
    { key: 'IN_TRANSIT', label: '배송 중' },
    { key: 'OUT_FOR_DELIVERY', label: '배송 출발' },
    { key: 'DELIVERED', label: '배송 완료' }
  ];

  const getCurrentStepIndex = () => {
    return steps.findIndex(step => step.key === status);
  };

  const currentStepIndex = getCurrentStepIndex();

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">
            {type === 'outbound' ? '발송' : '반납'} 배송 추적
          </h3>
          <p className="text-sm text-gray-600">
            {courierMap[courier] || courier} • {trackingNumber}
          </p>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
          currentStatus.color === 'gray' ? 'bg-gray-100 text-gray-700' :
          currentStatus.color === 'blue' ? 'bg-blue-100 text-blue-700' :
          'bg-green-100 text-green-700'
        }`}>
          {currentStatus.label}
        </div>
      </div>

      {/* 프로그레스 바 */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 mb-2">
          <span>진행률</span>
          <span>{currentStatus.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              currentStatus.color === 'green' ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${currentStatus.progress}%` }}
          ></div>
        </div>
      </div>

      {/* 배송 단계 */}
      <div className="space-y-2">
        {steps.map((step, index) => {
          const isCompleted = index <= currentStepIndex;
          const isCurrent = index === currentStepIndex;
          
          return (
            <div key={step.key} className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-3 ${
                isCompleted 
                  ? isCurrent 
                    ? 'bg-blue-500' 
                    : 'bg-green-500'
                  : 'bg-gray-300'
              }`}></div>
              <span className={`text-sm ${
                isCompleted ? 'text-gray-900 font-medium' : 'text-gray-500'
              }`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {status === 'DELIVERED' && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700 font-medium">
            ✅ 배송이 완료되었습니다
          </p>
          <p className="text-xs text-green-600 mt-1">
            {type === 'outbound' ? '수령 확인을 진행해주세요' : '반납 확인을 진행해주세요'}
          </p>
        </div>
      )}
    </div>
  );
};

export default ShippingStatusCard;
