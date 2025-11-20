/**
 * TrackingStatusCard Component
 * 배송 조회 상태 표시 카드 컴포넌트 (판매자/구매자 공통)
 * 검정/흰색 글래스모피즘 모던 디자인
 * 모바일 반응형 지원 (모바일에서 크기 50% 축소)
 */

import React, { useEffect, useState, useCallback } from 'react';
import { shippingApi } from '../api/shippingApi';

const TrackingStatusCard = ({ trackingNumber, courier }) => {
  const [trackingData, setTrackingData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // 배송 조회
  const handleTrack = useCallback(async () => {
    if (!trackingNumber || !courier) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await shippingApi.getTrackingStatus(trackingNumber, courier);
      setTrackingData(result);
      console.log('[TrackingStatusCard] 배송 조회 성공:', result);
    } catch (err) {
      console.error('[TrackingStatusCard] 배송 조회 실패:', err);
      setError(err.message || '배송 조회에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [trackingNumber, courier]);

  // 컴포넌트 마운트 시 자동 조회
  useEffect(() => {
    if (trackingNumber && courier) {
      handleTrack();
    }
  }, [trackingNumber, courier, handleTrack]);

  const courierMap = {
    cj: 'CJ대한통운',
    post: '우체국택배',
    lotte: '롯데택배',
    hanjin: '한진택배',
    logen: '로젠택배'
  };

  // 배송 상태 매핑
  const getStatusInfo = () => {
    if (!trackingData) {
      return { label: '조회 대기', date: null };
    }

    const status = trackingData.status || 'PENDING';
    const lastUpdateTime = trackingData.lastUpdateTime;
    
    const statusMap = {
      PENDING: { label: '집화 대기' },
      COLLECTED: { label: '집화 완료' },
      IN_TRANSIT: { label: '배송 중' },
      OUT_FOR_DELIVERY: { label: '배송 출발' },
      DELIVERED: { label: '배송완료 되었습니다' },
      EXCEPTION: { label: '배송 예외' }
    };

    const info = statusMap[status] || statusMap.PENDING;
    return {
      ...info,
      date: lastUpdateTime ? new Date(lastUpdateTime) : null,
      statusName: trackingData.statusName || info.label
    };
  };

  // 단색 아이콘 컴포넌트들
  const StepIcon = ({ isCompleted, children }) => (
    <div className={`w-7 h-7 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
      isCompleted 
        ? 'bg-gray-900 text-white shadow-lg md:scale-105' 
        : 'bg-gray-100 text-gray-400'
    }`}>
      {children}
    </div>
  );

  // 배송 단계 정의 - SVG 아이콘 사용
  const deliverySteps = [
    { 
      key: 'COLLECTED', 
      label: '상품접수', 
      icon: (
        <svg className="w-3 h-3 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ), 
      step: 1 
    },
    { 
      key: 'IN_TRANSIT_TERMINAL', 
      label: '터미널입고', 
      icon: (
        <svg className="w-3 h-3 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ), 
      step: 2 
    },
    { 
      key: 'IN_TRANSIT', 
      label: '상품이동중', 
      icon: (
        <svg className="w-3 h-3 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ), 
      step: 3 
    },
    { 
      key: 'TERMINAL_ARRIVED', 
      label: '배송터미널도착', 
      icon: (
        <svg className="w-3 h-3 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ), 
      step: 4 
    },
    { 
      key: 'OUT_FOR_DELIVERY', 
      label: '배송출발', 
      icon: (
        <svg className="w-3 h-3 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ), 
      step: 5 
    },
    { 
      key: 'DELIVERED', 
      label: '배송완료', 
      icon: (
        <svg className="w-3 h-3 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ), 
      step: 6 
    }
  ];

  // 현재 단계 인덱스 계산
  const getCurrentStepIndex = () => {
    if (!trackingData) return -1;
    
    const status = trackingData.status;
    const statusName = trackingData.statusName?.toLowerCase() || '';

    if (status === 'DELIVERED') return 5;
    if (status === 'OUT_FOR_DELIVERY' || statusName.includes('배송출발')) return 4;
    if (statusName.includes('터미널도착') || statusName.includes('터미널 도착')) return 3;
    if (status === 'IN_TRANSIT' || statusName.includes('이동중')) return 2;
    if (statusName.includes('터미널입고') || statusName.includes('터미널 입고')) return 1;
    if (status === 'COLLECTED' || statusName.includes('접수')) return 0;
    
    return 0;
  };

  const currentStepIndex = getCurrentStepIndex();
  const statusInfo = getStatusInfo();

  // 날짜 포맷팅
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    }).replace(/\./g, '-').replace(/\s/g, '');
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    return `${formatDate(dateString)} ${formatTime(dateString)}`;
  };

  return (
    <div className="bg-white/80 backdrop-blur-xl border border-gray-200/60 rounded-xl md:rounded-2xl shadow-xl overflow-hidden text-[0.5rem] md:text-base">
      {/* 최상단: 현재 배송 상태 바 */}
      {trackingData && (
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white px-3 py-2 md:px-6 md:py-5 border-b border-gray-900/20">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-[0.5rem] md:text-xs uppercase tracking-wider text-gray-300 mb-1 md:mb-2 font-medium">운송장번호</p>
              <p className="text-xs md:text-xl font-bold tracking-wider truncate">{trackingNumber}</p>
            </div>
            {statusInfo.date && (
              <div className="text-right flex-shrink-0">
                <p className="text-[0.5rem] md:text-sm text-gray-300 mb-0.5 md:mb-1">{formatDateTime(trackingData.lastUpdateTime)}</p>
                <p className="text-xs md:text-lg font-bold leading-tight">{statusInfo.label}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 로딩 상태 */}
      {isLoading && (
        <div className="px-3 py-8 md:px-6 md:py-16 text-center">
          <div className="inline-block animate-spin rounded-full h-6 w-6 md:h-12 md:w-12 border-2 border-gray-300 border-t-gray-900 mb-2 md:mb-4"></div>
          <p className="text-xs md:text-base text-gray-600 font-medium">배송 정보를 조회하는 중...</p>
        </div>
      )}

      {/* 에러 상태 */}
      {error && !isLoading && (
        <div className="px-3 py-4 md:px-6 md:py-8">
          <div className="bg-red-50/90 backdrop-blur-sm border border-red-200/60 rounded-lg md:rounded-xl p-3 md:p-5">
            <div className="flex items-start gap-2 md:gap-3">
              <svg className="w-3 h-3 md:w-5 md:h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-xs md:text-sm text-red-900 font-semibold mb-1">배송 조회 실패</p>
                <p className="text-[0.5rem] md:text-xs text-red-700 mb-2 md:mb-4 break-words">{error}</p>
                <button
                  onClick={handleTrack}
                  className="glass-button-danger text-[0.5rem] md:text-sm py-1 px-2 md:py-2 md:px-4"
                >
                  다시 시도
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 초기 상태 (조회 버튼) */}
      {!trackingData && !isLoading && !error && (
        <div className="px-3 py-6 md:px-6 md:py-12 text-center">
          <div className="mb-3 md:mb-6">
            <div className="w-8 h-8 md:w-16 md:h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-2 md:mb-4">
              <svg className="w-4 h-4 md:w-8 md:h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
          </div>
          <button
            onClick={handleTrack}
            className="glass-button text-xs md:text-base py-1.5 px-3 md:py-2 md:px-4"
          >
            배송 조회하기
          </button>
        </div>
      )}

      {/* 배송 정보 표시 */}
      {trackingData && !isLoading && (
        <div className="divide-y divide-gray-100">
          {/* 기본정보 섹션 */}
          <div className="px-3 py-3 md:px-6 md:py-6">
            <h3 className="text-xs md:text-lg font-bold text-gray-900 mb-2 md:mb-5 flex items-center gap-1 md:gap-2">
              <div className="w-0.5 h-2.5 md:w-1 md:h-5 bg-gray-900"></div>
              기본정보
            </h3>
            <div className="space-y-2 md:space-y-4">
              <div className="grid grid-cols-4 gap-2 md:gap-4 text-[0.5rem] md:text-sm">
                <div className="text-gray-500 font-medium col-span-1">상품명</div>
                <div className="col-span-3 text-gray-900 font-medium">상품 1개</div>
              </div>
              <div className="grid grid-cols-4 gap-2 md:gap-4 text-[0.5rem] md:text-sm">
                <div className="text-gray-500 font-medium col-span-1">택배사</div>
                <div className="col-span-3 text-gray-900 font-medium break-words">{courierMap[courier] || courier}</div>
              </div>
              {trackingData.currentLocation && (
                <div className="grid grid-cols-4 gap-2 md:gap-4 text-[0.5rem] md:text-sm">
                  <div className="text-gray-500 font-medium col-span-1">현재 위치</div>
                  <div className="col-span-3 text-gray-900 font-medium break-words">{trackingData.currentLocation}</div>
                </div>
              )}
            </div>
          </div>

          {/* 배송현황 섹션 */}
          <div className="px-3 py-3 md:px-6 md:py-6">
            <h3 className="text-xs md:text-lg font-bold text-gray-900 mb-4 md:mb-8 flex items-center gap-1 md:gap-2">
              <div className="w-0.5 h-2.5 md:w-1 md:h-5 bg-gray-900"></div>
              배송현황
            </h3>

            {/* 타임라인 */}
            <div className="mb-5 md:mb-10">
              <div className="flex items-center justify-between relative px-1 md:px-2">
                {/* 연결선 */}
                <div className="absolute top-3 left-3 right-3 md:top-6 md:left-6 md:right-6 h-[1px] md:h-[2px] bg-gray-200 -z-10">
                  <div 
                    className="h-full transition-all duration-700 ease-out bg-gray-900"
                    style={{ width: `${((currentStepIndex + 1) / deliverySteps.length) * 100}%` }}
                  ></div>
                </div>

                {/* 단계 아이콘들 */}
                {deliverySteps.map((step, index) => {
                  const isCompleted = index <= currentStepIndex;
                  return (
                    <div key={step.key} className="flex flex-col items-center relative z-10 flex-1">
                      <StepIcon isCompleted={isCompleted}>
                        {step.icon}
                      </StepIcon>
                      <div className="text-center mt-1.5 md:mt-3">
                        <p className={`text-[0.4rem] md:text-[10px] uppercase tracking-wider font-bold mb-0.5 md:mb-1 ${
                          isCompleted ? 'text-gray-900' : 'text-gray-400'
                        }`}>
                          STEP {step.step}
                        </p>
                        <p className={`text-[0.5rem] md:text-xs font-semibold leading-tight ${
                          isCompleted ? 'text-gray-900' : 'text-gray-500'
                        }`}>
                          {step.label}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 상세 이력 테이블 */}
            {trackingData.history && trackingData.history.length > 0 && (
              <div className="bg-gray-50/80 backdrop-blur-sm border border-gray-200/60 rounded-lg md:rounded-xl overflow-hidden">
                <div className="bg-gray-900/5 grid grid-cols-4 gap-1 md:gap-4 px-2 md:px-5 py-1.5 md:py-3.5 text-[0.4rem] md:text-xs font-bold text-gray-900 border-b border-gray-200 uppercase tracking-wider">
                  <div>날짜</div>
                  <div>시간</div>
                  <div>상품위치</div>
                  <div>배송 진행상황</div>
                </div>
                <div className="divide-y divide-gray-100 max-h-32 md:max-h-64 overflow-y-auto scrollbar-hide">
                  {[...trackingData.history].reverse().map((item, index) => (
                    <div key={index} className="grid grid-cols-4 gap-1 md:gap-4 px-2 md:px-5 py-1.5 md:py-3.5 text-[0.4rem] md:text-xs hover:bg-white/60 transition-colors group">
                      <div className="text-gray-900 font-medium break-words">{formatDate(item.timestamp)}</div>
                      <div className="text-gray-900 font-medium">{formatTime(item.timestamp)}</div>
                      <div className="text-gray-700 break-words">{item.location || '-'}</div>
                      <div className="text-gray-700 break-words">
                        {item.description || item.status || '-'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!trackingData.history || trackingData.history.length === 0) && (
              <div className="text-center py-4 md:py-12 text-gray-400 text-[0.5rem] md:text-sm">
                <svg className="w-6 h-6 md:w-12 md:h-12 mx-auto mb-1.5 md:mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>배송 이력이 없습니다.</p>
              </div>
            )}
          </div>

          {/* 새로고침 버튼 */}
          <div className="px-3 py-2 md:px-6 md:py-5 bg-gray-50/50 backdrop-blur-sm">
            <button
              onClick={handleTrack}
              disabled={isLoading}
              className="glass-button w-full text-[0.5rem] md:text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 md:gap-2 py-1.5 md:py-2.5"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-2 w-2 md:h-4 md:w-4 border-2 border-white border-t-transparent"></div>
                  <span>조회 중...</span>
                </>
              ) : (
                <>
                  <svg className="w-2 h-2 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>배송 정보 새로고침</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackingStatusCard;
