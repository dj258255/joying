/**
 * ShippingStatusCard Component
 * 배송 상태 표시 카드 컴포넌트 (수동 조회 지원)
 */

import React from 'react';
import { useShippingTracker } from '../hooks/useShippingTracker';

const ShippingStatusCard = ({ trackingNumber, courier, type = 'outbound' }) => {
  // 배송 추적 훅 사용 (수동 조회)
  const { 
    status, 
    trackingData, 
    isLoading, 
    error, 
    isDelivered,
    refetch 
  } = useShippingTracker(trackingNumber, courier);
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

  // 조회 버튼 클릭 핸들러
  const handleTrackClick = async () => {
    try {
      await refetch();
    } catch (err) {
      console.error('[ShippingStatusCard] 배송 조회 실패:', err);
    }
  };

  return (
    <div className="glass-list-item p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">
            {type === 'outbound' ? '발송' : '반납'} 배송 추적
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {courierMap[courier] || courier} • {trackingNumber}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {trackingData && (
            <div className={`px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm ${
              currentStatus.color === 'gray' ? 'bg-gray-900/20 text-gray-700 border border-gray-300/30' :
              currentStatus.color === 'blue' ? 'bg-blue-500/20 text-blue-700 border border-blue-300/30' :
              'bg-green-500/20 text-green-700 border border-green-300/30'
            }`}>
              {currentStatus.label}
            </div>
          )}
        </div>
      </div>

      {/* 조회 버튼 또는 로딩/에러 상태 */}
      {!trackingData && !isLoading && !error && (
        <div className="mb-4">
          <button
            onClick={handleTrackClick}
            className="glass-button w-full px-4 py-3 text-white rounded-xl font-medium hover:scale-105 transition-all duration-300"
          >
            📦 배송 조회하기
          </button>
        </div>
      )}

      {isLoading && (
        <div className="mb-4 text-center py-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="text-gray-600 mt-2">배송 정보를 조회하는 중...</p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-500/10 backdrop-blur-sm border border-red-300/30 rounded-xl">
          <p className="text-sm text-red-700 font-medium mb-2">
            ⚠️ 배송 조회 실패
          </p>
          <p className="text-xs text-red-600 mb-3">
            {error.message || '배송 정보를 불러올 수 없습니다.'}
          </p>
          <button
            onClick={handleTrackClick}
            className="glass-button-ghost text-xs px-3 py-1.5 rounded-lg hover:scale-105 transition-all duration-300"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* 배송 상태 표시 (조회된 경우에만) */}
      {trackingData && (
        <>
          {trackingData.currentLocation && (
            <div className="mb-3 p-3 bg-blue-500/10 backdrop-blur-sm border border-blue-300/30 rounded-xl">
              <p className="text-xs text-blue-700 font-medium mb-1">현재 위치</p>
              <p className="text-sm text-gray-900 font-semibold">{trackingData.currentLocation}</p>
              {trackingData.lastUpdateTime && (
                <p className="text-xs text-gray-600 mt-1">
                  업데이트: {new Date(trackingData.lastUpdateTime).toLocaleString('ko-KR')}
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* 프로그레스 바 */}
      {trackingData && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-600 mb-2">
            <span>진행률</span>
            <span className="font-semibold">{currentStatus.progress}%</span>
          </div>
          <div className="w-full bg-gray-900/20 backdrop-blur-sm rounded-full h-2.5 border border-gray-300/30">
            <div 
              className={`h-2.5 rounded-full transition-all duration-500 ${
                currentStatus.color === 'green' ? 'bg-green-500/80' : 'bg-blue-500/80'
              }`}
              style={{ width: `${currentStatus.progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* 배송 단계 (조회된 경우에만 표시) */}
      {trackingData && (
        <div className="space-y-2 mb-4">
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
      )}

      {/* 배송 히스토리 (조회된 경우에만 표시) */}
      {trackingData && trackingData.history && trackingData.history.length > 0 && (
        <div className="mt-4 border-t border-gray-300/30 pt-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">배송 히스토리</h4>
          <div className="space-y-3 max-h-48 overflow-y-auto scrollbar-hide">
            {trackingData.history.map((item, index) => (
              <div key={index} className="flex items-start gap-3 text-xs bg-white/20 backdrop-blur-sm p-2 rounded-lg border border-white/20">
                <div className="w-2 h-2 rounded-full bg-blue-500/80 mt-1.5 flex-shrink-0"></div>
                <div className="flex-1">
                  <p className="text-gray-900 font-medium">{item.status}</p>
                  {item.location && (
                    <p className="text-gray-700 mt-0.5">📍 {item.location}</p>
                  )}
                  {item.description && (
                    <p className="text-gray-600 mt-0.5">{item.description}</p>
                  )}
                  {item.timestamp && (
                    <p className="text-gray-500 mt-0.5 text-[10px]">
                      {new Date(item.timestamp).toLocaleString('ko-KR')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 배송 완료 메시지 */}
      {isDelivered && (
        <div className="mt-4 p-4 bg-green-500/10 backdrop-blur-sm border border-green-300/30 rounded-xl">
          <p className="text-sm text-green-700 font-medium">
            ✅ 배송이 완료되었습니다
          </p>
          <p className="text-xs text-green-600 mt-1">
            {type === 'outbound' ? '수령 확인을 진행해주세요' : '반납 확인을 진행해주세요'}
          </p>
        </div>
      )}

      {/* 재조회 버튼 (조회된 경우) */}
      {trackingData && (
        <div className="mt-4">
          <button
            onClick={handleTrackClick}
            disabled={isLoading}
            className="glass-button-ghost w-full px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-all duration-300"
          >
            {isLoading ? '조회 중...' : '🔄 배송 정보 새로고침'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ShippingStatusCard;
