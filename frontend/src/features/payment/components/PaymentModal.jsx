/**
 * PaymentModal Component
 * 토스 페이먼츠 결제 모달 컴포넌트
 */

import React, { useEffect, useRef, useState } from 'react';
import { loadPaymentWidget } from '@tosspayments/payment-widget-sdk';
import Modal from '../../../shared/components/Modal/Modal';
import { useAuth } from '@/features/auth/contexts/AuthContext';

/**
 * @param {Object} props
 * @param {boolean} props.isOpen - 모달 열림 상태
 * @param {Function} props.onClose - 모달 닫기 핸들러
 * @param {string} props.orderId - 주문 ID
 * @param {number} props.amount - 결제 금액
 * @param {string} props.orderName - 주문명
 * @param {Function} props.onSuccess - 결제 성공 콜백 (paymentKey, orderId, amount 전달)
 * @param {Function} props.onError - 결제 실패 콜백
 */
const PaymentModal = ({
  isOpen,
  onClose,
  orderId,
  amount,
  orderName,
  onSuccess,
  onError
}) => {
  const paymentWidgetRef = useRef(null);
  const paymentMethodsWidgetRef = useRef(null);
  const paymentMethodContainerRef = useRef(null);
  const agreementContainerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWidgetReady, setIsWidgetReady] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  // 토스 페이먼츠 클라이언트 키 (Client Key)
  // ⚠️ 중요: 클라이언트 키(Client Key)를 사용해야 합니다!
  // - 클라이언트 키: test_ck_... 또는 live_ck_... (프론트엔드용, 공개 가능)
  // - 시크릿 키: test_sk_... 또는 live_sk_... (백엔드용, 절대 노출 금지)
  // 토스 페이먼츠 대시보드에서 "클라이언트 키"를 복사하세요
  const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY?.trim();
  
  // customerKey 설정: 로그인한 사용자는 ID 사용, 비회원은 'anonymous'
  const customerKey = user?.id || user?.memberId || user?.member_id 
    ? `customer_${user.id || user.memberId || user.member_id}` 
    : 'anonymous';

  // 디버깅: 클라이언트 키 확인
  useEffect(() => {
    if (isOpen) {
      const rawKey = import.meta.env.VITE_TOSS_CLIENT_KEY;
      const trimmedKey = clientKey;
      
      console.log('[PaymentModal] 클라이언트 키 확인:', {
        'VITE_TOSS_CLIENT_KEY (원본)': rawKey,
        'clientKey (trimmed)': trimmedKey,
        'clientKey 길이': trimmedKey?.length,
        'clientKey 시작': trimmedKey?.substring(0, 10),
        '올바른 형식인가?': trimmedKey?.startsWith('test_ck_') || trimmedKey?.startsWith('live_ck_'),
        '공백 포함 여부': rawKey !== trimmedKey ? '⚠️ 공백이 포함되어 있었습니다!' : '정상',
        '환경 변수 타입': typeof rawKey,
        'customerKey': customerKey,
        'user 정보': user ? { id: user.id || user.memberId, email: user.email || user.memberEmail } : '비회원'
      });

      // 클라이언트 키 검증 경고
      if (!trimmedKey || trimmedKey.length < 30) {
        console.warn('[PaymentModal] ⚠️ 클라이언트 키가 너무 짧습니다. 올바른 키를 확인하세요.');
        console.warn('[PaymentModal] 현재 키 길이:', trimmedKey?.length);
      }
      
      if (trimmedKey && !trimmedKey.startsWith('test_ck_') && !trimmedKey.startsWith('live_ck_')) {
        console.warn('[PaymentModal] ⚠️ 클라이언트 키 형식이 올바르지 않습니다. test_ck_... 또는 live_ck_...로 시작해야 합니다.');
        console.warn('[PaymentModal] 현재 키 시작:', trimmedKey?.substring(0, 15));
      }

      // 클라이언트 키가 실제로 유효한지 추가 확인
      if (trimmedKey) {
        const keyPattern = /^(test_ck_|live_ck_)[a-zA-Z0-9_-]+$/;
        if (!keyPattern.test(trimmedKey)) {
          console.error('[PaymentModal] ❌ 클라이언트 키 형식이 올바르지 않습니다. 알파벳, 숫자, 하이픈, 언더스코어만 허용됩니다.');
        } else {
          console.log('[PaymentModal] ✅ 클라이언트 키 형식 검증 통과');
        }
      }
    }
  }, [isOpen, clientKey, customerKey, user]);

  useEffect(() => {
    // 모달이 닫힐 때 상태 초기화
    if (!isOpen) {
      setIsLoading(true);
      setIsWidgetReady(false);
      setError(null);
      return;
    }

    // 결제 금액 검증
    if (!orderId) {
      const err = new Error('주문 ID가 필요합니다.');
      setError(err.message);
      setIsLoading(false);
      onError?.(err);
      return;
    }

    if (!amount || amount <= 0) {
      const err = new Error('결제 금액이 유효하지 않습니다.');
      setError(err.message);
      setIsLoading(false);
      onError?.(err);
      return;
    }

    // 결제 금액 최소/최대 제한 검증 (토스 페이먼츠 권장사항)
    if (amount < 100) {
      const err = new Error('결제 금액은 최소 100원 이상이어야 합니다.');
      setError(err.message);
      setIsLoading(false);
      onError?.(err);
      return;
    }

    if (amount > 100000000) {
      const err = new Error('결제 금액은 최대 100,000,000원을 초과할 수 없습니다.');
      setError(err.message);
      setIsLoading(false);
      onError?.(err);
      return;
    }

    // 클라이언트 키 검증
    if (!clientKey || clientKey === '' || clientKey === "''" || clientKey === '""') {
      const err = new Error('토스 페이먼츠 클라이언트 키가 설정되지 않았습니다. .env 파일에 VITE_TOSS_CLIENT_KEY를 설정해주세요.');
      setError(err.message);
      setIsLoading(false);
      onError?.(err);
      return;
    }

    // 클라이언트 키 형식 검증 (시크릿 키가 아닌지 확인)
    if (clientKey.startsWith('test_sk_') || clientKey.startsWith('live_sk_')) {
      const err = new Error('시크릿 키(Secret Key)를 사용하고 있습니다. 클라이언트 키(Client Key: test_ck_... 또는 live_ck_...)를 사용해야 합니다.');
      setError(err.message);
      setIsLoading(false);
      onError?.(err);
      return;
    }

    // 클라이언트 키 형식 검증 (올바른 형식인지 확인)
    if (!clientKey.startsWith('test_ck_') && !clientKey.startsWith('live_ck_')) {
      const err = new Error('올바르지 않은 클라이언트 키 형식입니다. test_ck_... 또는 live_ck_...로 시작해야 합니다.');
      setError(err.message);
      setIsLoading(false);
      onError?.(err);
      return;
    }

    // 토스 페이먼츠 위젯 로드
    const loadWidget = async () => {
      // 네트워크 에러 모니터링 변수 (함수 스코프 최상단으로 이동)
      let has401Error = false;
      let errorMonitorActive = true;
      let originalFetch = null;
      let originalXHROpen = null;
      let originalXHRSend = null;
      
      try {
        setIsLoading(true);
        setError(null);

        // 1. 네트워크 에러 모니터링 설정 (가장 먼저 - 401 에러 감지를 위해)
        // fetch 인터셉터 설정
        try {
          originalFetch = window.fetch;
          const interceptedFetch = async (...args) => {
            // URL 추출 (여러 방법 시도)
            let requestUrl = '';
            try {
              if (typeof args[0] === 'string') {
                requestUrl = args[0];
              } else if (args[0] instanceof Request) {
                requestUrl = args[0].url;
              } else if (args[0]?.url) {
                requestUrl = args[0].url;
              } else if (args[0]?.toString) {
                requestUrl = args[0].toString();
              }
            } catch (e) {
              // URL 추출 실패해도 계속 진행
            }

            // 원본 fetch 호출
            let response;
            try {
              response = await originalFetch(...args);
            } catch (fetchError) {
              // 네트워크 에러도 처리
              console.error('[PaymentModal] fetch 요청 실패:', fetchError);
              throw fetchError;
            }
            
            // 401 에러 감지 (토스 페이먼츠 API 요청인 경우)
            if (errorMonitorActive) {
              const responseUrl = response.url || requestUrl || '';
              const isTossApiRequest = (requestUrl && requestUrl.includes('api.tosspayments.com')) || 
                                      (responseUrl && responseUrl.includes('api.tosspayments.com'));
              
              if (isTossApiRequest) {
                // 상태 코드 확인
                if (response.status === 401) {
                  has401Error = true;
                  console.error('[PaymentModal] ⚠️ 401 에러 감지 (fetch 인터셉터):', {
                    requestUrl,
                    responseUrl: response.url,
                    status: response.status,
                    statusText: response.statusText,
                    '요청 인자': args,
                    '전체 URL': responseUrl || requestUrl
                  });
                }
                
                // 응답 본문도 확인 (에러 메시지에 401이 포함되어 있을 수 있음)
                if (response.status >= 400) {
                  try {
                    const clonedResponse = response.clone();
                    clonedResponse.text().then(text => {
                      if (text.includes('401') || text.includes('Unauthorized') || text.includes('인증되지 않은')) {
                        if (!has401Error && response.status === 401) {
                          has401Error = true;
                          console.error('[PaymentModal] ⚠️ 401 에러 감지 (응답 본문 확인):', text.substring(0, 200));
                        }
                      }
                    }).catch(() => {});
                  } catch (e) {
                    // clone 실패해도 계속 진행
                  }
                }
              }
            }
            
            return response;
          };
          
          window.fetch = interceptedFetch;
          console.log('[PaymentModal] ✅ fetch 인터셉터 설정 완료');
        } catch (fetchError) {
          console.warn('[PaymentModal] fetch 인터셉터 설정 실패 (무시됨):', fetchError);
          originalFetch = null;
        }

        // XMLHttpRequest 인터셉터 설정 (토스 SDK가 XHR을 사용할 수도 있음)
        try {
          originalXHROpen = XMLHttpRequest.prototype.open;
          originalXHRSend = XMLHttpRequest.prototype.send;
          
          XMLHttpRequest.prototype.open = function(method, url, ...rest) {
            this._paymentModalUrl = url;
            return originalXHROpen.apply(this, [method, url, ...rest]);
          };
          
          XMLHttpRequest.prototype.send = function(...args) {
            const xhr = this;
            const originalOnReadyStateChange = xhr.onreadystatechange;
            const originalOnLoad = xhr.onload;
            const originalOnError = xhr.onerror;
            
            // onreadystatechange 핸들러
            xhr.onreadystatechange = function() {
              if (errorMonitorActive && xhr.readyState === 4) {
                const url = xhr._paymentModalUrl || xhr.responseURL || xhr.responseURL || '';
                if (url && url.includes('api.tosspayments.com')) {
                  if (xhr.status === 401) {
                    has401Error = true;
                    console.error('[PaymentModal] ⚠️ 401 에러 감지 (XHR 인터셉터 - onreadystatechange):', {
                      url,
                      status: xhr.status,
                      statusText: xhr.statusText,
                      responseText: xhr.responseText?.substring(0, 200)
                    });
                  }
                }
              }
              
              if (originalOnReadyStateChange) {
                originalOnReadyStateChange.apply(this, arguments);
              }
            };
            
            // onload 핸들러도 추가
            xhr.onload = function() {
              if (errorMonitorActive && xhr.status === 401) {
                const url = xhr._paymentModalUrl || xhr.responseURL || '';
                if (url && url.includes('api.tosspayments.com')) {
                  has401Error = true;
                  console.error('[PaymentModal] ⚠️ 401 에러 감지 (XHR 인터셉터 - onload):', {
                    url,
                    status: xhr.status,
                    statusText: xhr.statusText
                  });
                }
              }
              
              if (originalOnLoad) {
                originalOnLoad.apply(this, arguments);
              }
            };
            
            // onerror 핸들러도 추가
            xhr.onerror = function() {
              if (errorMonitorActive) {
                const url = xhr._paymentModalUrl || xhr.responseURL || '';
                if (url && url.includes('api.tosspayments.com')) {
                  console.warn('[PaymentModal] XHR 에러 발생 (토스 API):', url);
                }
              }
              
              if (originalOnError) {
                originalOnError.apply(this, arguments);
              }
            };
            
            return originalXHRSend.apply(this, args);
          };
          
          console.log('[PaymentModal] ✅ XMLHttpRequest 인터셉터 설정 완료');
        } catch (xhrError) {
          console.warn('[PaymentModal] XMLHttpRequest 인터셉터 설정 실패 (무시됨):', xhrError);
          originalXHROpen = null;
          originalXHRSend = null;
        }

        // 2. 이전 위젯 인스턴스 정리 (cleanup) - 위젯 재렌더링 방지
        try {
          if (paymentMethodsWidgetRef.current) {
            console.log('[PaymentModal] 이전 paymentMethodsWidget 정리 중...');
            if (typeof paymentMethodsWidgetRef.current.cleanup === 'function') {
              await paymentMethodsWidgetRef.current.cleanup();
            } else if (typeof paymentMethodsWidgetRef.current.destroy === 'function') {
              await paymentMethodsWidgetRef.current.destroy();
            }
            paymentMethodsWidgetRef.current = null;
          }
          if (paymentWidgetRef.current) {
            console.log('[PaymentModal] 이전 paymentWidget 정리 중...');
            if (typeof paymentWidgetRef.current.cleanup === 'function') {
              await paymentWidgetRef.current.cleanup();
            } else if (typeof paymentWidgetRef.current.destroy === 'function') {
              await paymentWidgetRef.current.destroy();
            }
            paymentWidgetRef.current = null;
          }
          
          // DOM 요소 초기화는 위젯 인스턴스 cleanup이 자동으로 처리하므로
          // React가 관리하는 DOM을 직접 조작하지 않음
          // 위젯 인스턴스의 cleanup/destroy가 자동으로 DOM 정리
          console.log('[PaymentModal] 이전 위젯 인스턴스 정리 완료');
        } catch (cleanupError) {
          console.warn('[PaymentModal] 이전 위젯 정리 중 에러 (무시됨):', cleanupError);
          // 정리 실패해도 계속 진행
        }

        // DOM 요소가 존재할 때까지 대기 (최대 1초)
        let attempts = 0;
        const maxAttempts = 20; // 20번 시도 (1초)
        
        while (attempts < maxAttempts) {
          const paymentMethodElement = paymentMethodContainerRef.current || document.getElementById('payment-method-widget');
          const agreementElement = agreementContainerRef.current || document.getElementById('agreement-widget');

          if (paymentMethodElement && agreementElement) {
            // DOM 요소가 준비되었으므로 위젯 로드
            try {
              console.log('[PaymentModal] 위젯 로드 시작:', {
                clientKey: clientKey?.substring(0, 20) + '...',
                clientKeyLength: clientKey?.length,
                clientKeyPrefix: clientKey?.substring(0, 8),
                customerKey,
                paymentMethodElement: !!paymentMethodElement,
                agreementElement: !!agreementElement,
                user: user ? { id: user.id || user.memberId, email: user.email || user.memberEmail } : '비회원'
              });

              // 클라이언트 키가 실제로 전달되는지 최종 확인
              if (!clientKey || clientKey.length < 30) {
                throw new Error(`클라이언트 키가 유효하지 않습니다. 길이: ${clientKey?.length}, 키: ${clientKey?.substring(0, 20)}...`);
              }

              console.log('[PaymentModal] loadPaymentWidget 호출:', {
                clientKey: clientKey.substring(0, 15) + '...',
                clientKeyFullLength: clientKey.length,
                clientKeyStartsWith: clientKey.substring(0, 10),
                customerKey,
                '클라이언트 키 검증': {
                  'test_ck_로 시작': clientKey.startsWith('test_ck_'),
                  'live_ck_로 시작': clientKey.startsWith('live_ck_'),
                  '길이 검증': clientKey.length >= 30,
                  '공백 없음': clientKey.trim() === clientKey
                }
              });

              // 클라이언트 키를 Base64 인코딩해서 전달되는지 확인 (토스 페이먼츠는 Basic Auth 사용)
              // 실제로는 SDK 내부에서 처리하지만, 확인을 위해
              const base64Key = btoa(clientKey + ':');
              console.log('[PaymentModal] 클라이언트 키 Base64 (디버깅용):', {
                'Base64 (처음 30자)': base64Key.substring(0, 30) + '...',
                'Base64 (전체)': base64Key,
                '예상 Authorization 헤더': `Basic ${base64Key}`,
                '참고': '토스 페이먼츠 SDK는 내부적으로 이 값을 Authorization 헤더로 전송합니다.'
              });

              // SDK가 실제로 사용할 클라이언트 키 확인
              if (typeof clientKey !== 'string' || clientKey.length === 0) {
                throw new Error('클라이언트 키가 문자열이 아니거나 비어있습니다.');
              }

              // 위젯 인스턴스 생성
              let paymentWidget;
              try {
                paymentWidget = await loadPaymentWidget(clientKey, customerKey);
                paymentWidgetRef.current = paymentWidget;
                
                console.log('[PaymentModal] 위젯 인스턴스 생성 완료:', {
                  widgetType: typeof paymentWidget,
                  hasRenderMethods: typeof paymentWidget?.renderPaymentMethods === 'function',
                  hasRequestPayment: typeof paymentWidget?.requestPayment === 'function'
                });
              } catch (sdkError) {
                console.error('[PaymentModal] SDK loadPaymentWidget 에러:', {
                  error: sdkError,
                  message: sdkError.message,
                  name: sdkError.name,
                  clientKey: clientKey.substring(0, 15) + '...',
                  clientKeyLength: clientKey.length
                });
                throw sdkError;
              }

              // paymentWidget이 생성되었는지 확인
              if (!paymentWidget || !paymentWidgetRef.current) {
                throw new Error('위젯 인스턴스가 생성되지 않았습니다.');
              }

              // 결제 수단 위젯 렌더링
              try {
                console.log('[PaymentModal] renderPaymentMethods 호출 시작:', {
                  selector: '#payment-method-widget',
                  amount,
                  variantKey: 'DEFAULT'
                });

                // 401 에러 감지를 위해 렌더링 전에 상태 초기화 (이미 false이지만 명시)
                // has401Error는 이미 함수 스코프에서 false로 초기화됨

                const paymentMethodsWidget = paymentWidget.renderPaymentMethods(
                  '#payment-method-widget',
                  { value: amount },
                  { variantKey: 'DEFAULT' }
                );
                paymentMethodsWidgetRef.current = paymentMethodsWidget;

                console.log('[PaymentModal] renderPaymentMethods 완료:', {
                  widgetType: typeof paymentMethodsWidget
                });

                // 이용약관 위젯 렌더링
                console.log('[PaymentModal] renderAgreement 호출 시작');
                paymentWidget.renderAgreement('#agreement-widget', { variantKey: 'AGREEMENT' });
                console.log('[PaymentModal] renderAgreement 완료');
              } catch (renderError) {
                console.error('[PaymentModal] 위젯 렌더링 중 에러:', renderError);
                // 인터셉터 복원
                if (originalFetch) {
                  try {
                    window.fetch = originalFetch;
                  } catch (e) {
                    console.warn('[PaymentModal] fetch 인터셉터 복원 실패:', e);
                  }
                }
                if (originalXHROpen && originalXHRSend) {
                  try {
                    XMLHttpRequest.prototype.open = originalXHROpen;
                    XMLHttpRequest.prototype.send = originalXHRSend;
                  } catch (e) {
                    console.warn('[PaymentModal] XHR 인터셉터 복원 실패:', e);
                  }
                }
                errorMonitorActive = false;
                throw new Error(`위젯 렌더링 실패: ${renderError.message || '알 수 없는 에러'}`);
              }

              // 위젯이 완전히 렌더링될 때까지 대기 (최대 5초)
              let renderCheckAttempts = 0;
              const maxRenderChecks = 50; // 5초 (100ms * 50)
              
              while (renderCheckAttempts < maxRenderChecks) {
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // 401 에러 확인 (최우선) - 매번 체크
                if (has401Error) {
                  console.error('[PaymentModal] 401 에러 감지됨 - 위젯 로드 중단');
                  // 인터셉터 복원
                  if (originalFetch) {
                    try {
                      window.fetch = originalFetch;
                    } catch (e) {
                      console.warn('[PaymentModal] fetch 인터셉터 복원 실패:', e);
                    }
                  }
                  if (originalXHROpen && originalXHRSend) {
                    try {
                      XMLHttpRequest.prototype.open = originalXHROpen;
                      XMLHttpRequest.prototype.send = originalXHRSend;
                    } catch (e) {
                      console.warn('[PaymentModal] XHR 인터셉터 복원 실패:', e);
                    }
                  }
                  errorMonitorActive = false;
                  throw new Error('클라이언트 키 인증에 실패했습니다 (401 에러). 토스 페이먼츠 대시보드에서 클라이언트 키를 재확인하고 .env 파일을 업데이트한 후 개발 서버를 재시작해주세요.');
                }
                
                // 추가: 네트워크 탭에서 401 에러 확인 (백업 방법)
                // 실제로는 fetch 인터셉터가 작동해야 하지만, 혹시 모를 경우를 대비
                // 참고: performance API로는 HTTP 상태 코드를 직접 확인할 수 없으므로
                // fetch/XHR 인터셉터에 의존

                const widgetElement = document.querySelector('#payment-method-widget');
                
                // 더 엄격한 위젯 콘텐츠 확인
                // 빈 div나 로딩 스피너만 있는 경우는 제외
                const hasWidgetContent = widgetElement && (
                  widgetElement.children.length > 0 && 
                  widgetElement.innerHTML.trim().length > 50 && // 최소한의 콘텐츠가 있어야 함
                  !widgetElement.innerHTML.includes('animate-spin') && // 로딩 스피너가 아닌지 확인
                  (widgetElement.querySelector('button') || 
                   widgetElement.querySelector('[role="button"]') ||
                   widgetElement.querySelector('input') ||
                   widgetElement.querySelector('label') ||
                   widgetElement.querySelector('[class*="payment"]') ||
                   widgetElement.querySelector('[class*="method"]'))
                );

                // 에러 요소 확인 (더 넓은 범위)
                const errorElements = document.querySelectorAll(
                  '[class*="error"], [class*="Error"], [class*="unauthorized"], [class*="Unauthorized"], ' +
                  '[class*="401"], [class*="fail"], [class*="Fail"], [id*="error"], [id*="Error"]'
                );
                
                if (errorElements.length > 0) {
                  const errorText = Array.from(errorElements).map(el => el.textContent || el.innerText).join(' ');
                  console.warn('[PaymentModal] 위젯 내부에 에러 요소가 발견되었습니다:', errorText);
                  if (errorText.includes('401') || errorText.includes('unauthorized') || errorText.includes('인증')) {
                    throw new Error('위젯 로드 중 인증 에러가 발생했습니다. 클라이언트 키가 유효하지 않거나 인증에 실패했습니다.');
                  }
                }

                // 실제 결제 수단이 렌더링되었는지 확인
                if (hasWidgetContent) {
                  // 추가 검증: 실제로 클릭 가능한 요소가 있는지 확인
                  const clickableElements = widgetElement.querySelectorAll('button, [role="button"], input[type="radio"], label');
                  if (clickableElements.length > 0) {
                    console.log('[PaymentModal] 위젯이 정상적으로 렌더링되었습니다. 클릭 가능한 요소:', clickableElements.length);
                    break;
                  } else {
                    console.warn('[PaymentModal] 위젯 콘텐츠는 있지만 클릭 가능한 요소가 없습니다. 계속 대기...');
                  }
                }

                renderCheckAttempts++;
              }

              // 인터셉터 복원
              if (originalFetch) {
                try {
                  window.fetch = originalFetch;
                } catch (e) {
                  console.warn('[PaymentModal] fetch 인터셉터 복원 실패:', e);
                }
              }
              if (originalXHROpen && originalXHRSend) {
                try {
                  XMLHttpRequest.prototype.open = originalXHROpen;
                  XMLHttpRequest.prototype.send = originalXHRSend;
                } catch (e) {
                  console.warn('[PaymentModal] XHR 인터셉터 복원 실패:', e);
                }
              }
              errorMonitorActive = false;

              // 401 에러 최종 확인
              if (has401Error) {
                throw new Error('클라이언트 키 인증에 실패했습니다 (401 에러). 토스 페이먼츠 대시보드에서 클라이언트 키를 재확인하고 .env 파일을 업데이트한 후 개발 서버를 재시작해주세요.');
              }

              // 최종 확인 (더 엄격한 검증)
              const widgetElement = document.querySelector('#payment-method-widget');
              const hasValidContent = widgetElement && (
                widgetElement.children.length > 0 && 
                widgetElement.innerHTML.trim().length > 50 &&
                (widgetElement.querySelector('button') || 
                 widgetElement.querySelector('[role="button"]') ||
                 widgetElement.querySelector('input') ||
                 widgetElement.querySelector('label'))
              );

              if (!hasValidContent) {
                console.warn('[PaymentModal] 위젯 컨텐츠가 없거나 유효하지 않습니다. 401 에러일 가능성이 있습니다.');
                console.error('[PaymentModal] ⚠️ 클라이언트 키 인증 실패 - 다음을 확인하세요:');
                console.error('[PaymentModal] 1. 토스 페이먼츠 대시보드(https://developers.tosspayments.com) 로그인');
                console.error('[PaymentModal] 2. "내 상점" → "상점 정보" → "연동 키" 메뉴에서 클라이언트 키 확인');
                console.error('[PaymentModal] 3. 현재 사용 중인 클라이언트 키:', clientKey);
                console.error('[PaymentModal] 4. 상점 상태가 "활성화"인지 확인');
                console.error('[PaymentModal] 5. 테스트 모드/실제 모드 설정 확인');
                console.error('[PaymentModal] 6. 클라이언트 키가 만료되지 않았는지 확인');
                throw new Error('위젯이 렌더링되지 않았습니다. 클라이언트 키가 유효하지 않거나 인증에 실패했습니다.\n\n해결 방법:\n1. 토스 페이먼츠 대시보드에서 클라이언트 키 재확인\n2. 상점 상태가 "활성화"인지 확인\n3. 테스트/실제 모드 설정 확인\n4. 클라이언트 키를 .env 파일에 다시 설정하고 개발 서버 재시작');
              }

              // 위젯 인스턴스가 실제로 작동하는지 확인
              if (!paymentWidgetRef.current || typeof paymentWidgetRef.current.requestPayment !== 'function') {
                throw new Error('위젯 인스턴스가 올바르게 초기화되지 않았습니다.');
              }

              console.log('[PaymentModal] 위젯 로드 완료 - 검증 통과');
              setIsLoading(false);
              setIsWidgetReady(true);
              return;
            } catch (widgetError) {
              // 인터셉터 복원 (에러 발생 시에도)
              if (originalFetch) {
                try {
                  window.fetch = originalFetch;
                } catch (e) {
                  console.warn('[PaymentModal] fetch 인터셉터 복원 실패:', e);
                }
              }
              if (originalXHROpen && originalXHRSend) {
                try {
                  XMLHttpRequest.prototype.open = originalXHROpen;
                  XMLHttpRequest.prototype.send = originalXHRSend;
                } catch (e) {
                  console.warn('[PaymentModal] XHR 인터셉터 복원 실패:', e);
                }
              }
              errorMonitorActive = false;
              
              console.error('[PaymentModal] 위젯 로드 중 에러:', {
                error: widgetError,
                message: widgetError.message,
                stack: widgetError.stack,
                name: widgetError.name,
                clientKey: clientKey?.substring(0, 15) + '...',
                customerKey
              });
              
              // 다양한 에러 타입 처리
              const errorMessage = widgetError.message || String(widgetError);
              const errorString = errorMessage.toLowerCase();
              
              // 네트워크 탭 확인을 위한 안내 추가
              if (errorString.includes('401') || 
                  errorString.includes('unauthorized') || 
                  errorString.includes('인증되지 않은') ||
                  errorString.includes('알 수 없는 에러')) {
                console.error('[PaymentModal] ⚠️ 401 에러 상세 정보:', {
                  '클라이언트 키 형식': clientKey?.startsWith('test_ck_') ? 'test_ck' : clientKey?.startsWith('live_ck_') ? 'live_ck' : '알 수 없음',
                  '클라이언트 키 길이': clientKey?.length,
                  '클라이언트 키 시작': clientKey?.substring(0, 10),
                  '클라이언트 키 전체': clientKey, // 전체 키 출력 (디버깅용)
                  'customerKey': customerKey,
                  'SDK 버전': '@tosspayments/payment-widget-sdk@0.12.1',
                  '디버깅 단계': [
                    '1. 브라우저 개발자 도구 > Network 탭 열기',
                    '2. "widget-groups/keys" 요청 찾기',
                    '3. Request Headers > Authorization 헤더 확인',
                    '4. Authorization 헤더에 클라이언트 키가 올바르게 포함되어 있는지 확인',
                    '5. 토스 페이먼츠 대시보드에서 클라이언트 키 재확인',
                    '6. 상점 상태가 활성화되어 있는지 확인'
                  ]
                });
                
                // Network 탭에서 확인할 수 있는 정보 출력
                console.group('🔍 Network 탭 확인 가이드');
                console.log('⚠️ 중요: Authorization 헤더가 Network 탭에 보이지 않을 수 있습니다.');
                console.log('   토스 페이먼츠 SDK는 클라이언트 키를 내부적으로 처리하며,');
                console.log('   브라우저 보안 정책으로 인해 헤더가 숨겨질 수 있습니다.');
                console.log('');
                console.log('확인 방법:');
                console.log('1. Network 탭에서 "widget-groups/keys" 또는 "api.tosspayments.com" 요청 찾기');
                console.log('2. 해당 요청 클릭 → Headers 탭');
                console.log('3. Request Headers 섹션에서 모든 헤더 확인');
                console.log('4. Response 탭에서 에러 메시지 확인 (가장 중요!)');
                console.log('5. Preview 탭에서 응답 내용 확인');
                console.log('');
                console.log('✅ 콘솔에 출력된 클라이언트 키 정보:');
                console.log('   - 클라이언트 키 전체:', clientKey);
                console.log('   - Base64 인코딩:', btoa(clientKey + ':'));
                console.log('   - 예상 Authorization:', `Basic ${btoa(clientKey + ':')}`);
                console.log('');
                console.log('💡 다음을 확인하세요:');
                console.log('   1. 토스 페이먼츠 대시보드에서 클라이언트 키 재확인');
                console.log('   2. 상점 상태가 "활성화"인지 확인');
                console.log('   3. 테스트 모드/실제 모드 설정 확인');
                console.log('   4. 클라이언트 키가 만료되지 않았는지 확인');
                console.groupEnd();
                
                throw new Error('클라이언트 키가 유효하지 않거나 인증에 실패했습니다. 콘솔의 "Network 탭 확인 가이드"를 참고하여 요청 헤더를 확인하고, 토스 페이먼츠 대시보드에서 상점 상태와 클라이언트 키를 재확인해주세요.');
              } else if (errorString.includes('network') || 
                         errorString.includes('fetch') ||
                         errorString.includes('네트워크')) {
                throw new Error('네트워크 연결에 문제가 있습니다. 인터넷 연결을 확인해주세요.');
              } else if (errorString.includes('timeout') || 
                         errorString.includes('타임아웃')) {
                throw new Error('요청 시간이 초과되었습니다. 다시 시도해주세요.');
              } else if (errorString.includes('cors') || 
                         errorString.includes('cross-origin')) {
                throw new Error('CORS 오류가 발생했습니다. 브라우저 설정을 확인해주세요.');
              }
              
              throw widgetError;
            }
          }

          // 50ms 대기 후 다시 시도
          await new Promise(resolve => setTimeout(resolve, 50));
          attempts++;
        }

        // 최대 시도 횟수 초과
        const err = new Error('결제 위젯 컨테이너를 찾을 수 없습니다. 모달이 완전히 열린 후 다시 시도해주세요.');
        setError(err.message);
        setIsLoading(false);
        onError?.(err);
        return;
      } catch (err) {
        console.error('[PaymentModal] 토스 페이먼츠 위젯 로드 실패:', err);
        const errorMessage = err.message || '결제 위젯을 불러오는데 실패했습니다.';
        
        // 401 에러 또는 인증 관련 에러인 경우 더 명확한 메시지
        if (errorMessage.includes('401') || 
            errorMessage.includes('Unauthorized') || 
            errorMessage.includes('인증되지 않은') ||
            errorMessage.includes('알 수 없는 에러') ||
            errorMessage.includes('클라이언트 키')) {
          setError('클라이언트 키가 유효하지 않거나 인증에 실패했습니다. 토스 페이먼츠 대시보드에서 올바른 클라이언트 키(test_ck_... 또는 live_ck_...)를 확인하고 .env 파일에 설정한 후 개발 서버를 재시작해주세요.');
        } else {
          setError(errorMessage);
        }
        
        setIsLoading(false);
        setIsWidgetReady(false);
        onError?.(err);
      }
    };

    // 모달이 열린 후 약간의 지연을 두고 위젯 로드
    const timer = setTimeout(() => {
      loadWidget();
    }, 200);

    return () => {
      clearTimeout(timer);
      
      // 위젯 인스턴스 정리 (DOM 조작 최소화)
      // React가 DOM을 관리하므로 직접 DOM 조작은 피하고 위젯 인스턴스만 정리
      try {
        // 위젯 인스턴스 정리 (순서 중요: 자식 위젯 먼저)
        if (paymentMethodsWidgetRef.current) {
          try {
            // 위젯 인스턴스의 cleanup/destroy 메서드 호출
            const widget = paymentMethodsWidgetRef.current;
            if (typeof widget.cleanup === 'function') {
              widget.cleanup();
            } else if (typeof widget.destroy === 'function') {
              widget.destroy();
            }
          } catch (e) {
            // 위젯 정리 중 에러는 무시 (이미 정리되었을 수 있음)
            console.warn('[PaymentModal] paymentMethodsWidget 정리 중 에러 (무시됨):', e);
          } finally {
            paymentMethodsWidgetRef.current = null;
          }
        }

        if (paymentWidgetRef.current) {
          try {
            // 위젯 인스턴스의 cleanup/destroy 메서드 호출
            const widget = paymentWidgetRef.current;
            if (typeof widget.cleanup === 'function') {
              widget.cleanup();
            } else if (typeof widget.destroy === 'function') {
              widget.destroy();
            }
          } catch (e) {
            // 위젯 정리 중 에러는 무시 (이미 정리되었을 수 있음)
            console.warn('[PaymentModal] paymentWidget 정리 중 에러 (무시됨):', e);
          } finally {
            paymentWidgetRef.current = null;
          }
        }

        // fetch 인터셉터 복원 (설정되어 있었다면)
        // 주의: originalFetch는 loadWidget 함수 스코프 내에 있으므로 여기서는 접근 불가
        // 대신 window.fetch가 우리가 설정한 것인지 확인하고 복원
        // 하지만 cleanup 함수는 loadWidget 밖에 있으므로 originalFetch 접근 불가
        // 따라서 fetch 인터셉터는 loadWidget 내부에서만 복원하도록 함
      } catch (cleanupError) {
        // 정리 중 에러는 치명적이지 않으므로 무시
        console.warn('[PaymentModal] 위젯 정리 중 에러 (무시됨):', cleanupError);
      }
    };
  }, [isOpen, orderId, amount, clientKey, customerKey, onError]);

  // 결제 요청 (토스 페이먼츠 결제 페이지로 이동)
  const handlePayment = async () => {
    if (!paymentWidgetRef.current) {
      const err = new Error('결제 위젯이 로드되지 않았습니다.');
      setError(err.message);
      setIsWidgetReady(false);
      onError?.(err);
      return;
    }

    if (isLoading || !isWidgetReady) {
      const err = new Error('결제 위젯이 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.');
      setError(err.message);
      onError?.(err);
      return;
    }

    // 결제 요청 전 최종 확인: 위젯이 실제로 렌더링되었는지 재확인
    const widgetElement = document.querySelector('#payment-method-widget');
    const hasValidContent = widgetElement && (
      widgetElement.children.length > 0 && 
      widgetElement.innerHTML.trim().length > 50 &&
      (widgetElement.querySelector('button') || 
       widgetElement.querySelector('[role="button"]') ||
       widgetElement.querySelector('input') ||
       widgetElement.querySelector('label'))
    );

    if (!hasValidContent) {
      const err = new Error('결제 UI가 아직 렌더링되지 않았습니다. 클라이언트 키 인증 문제일 수 있습니다. 잠시 후 다시 시도하거나, 토스 페이먼츠 대시보드에서 클라이언트 키를 확인해주세요.');
      setError(err.message);
      setIsWidgetReady(false);
      setIsLoading(true);
      onError?.(err);
      return;
    }

    try {
      // 실제 사용자 정보 가져오기
      const customerEmail = user?.email || user?.memberEmail || 'customer@example.com';
      const customerName = user?.name || user?.memberName || user?.username || '고객';

      console.log('[PaymentModal] 결제 요청 시작:', { 
        orderId, 
        orderName, 
        amount,
        customerEmail,
        customerName,
        customerKey
      });
      
      // 토스 페이먼츠 결제 요청
      // successUrl과 failUrl에 필요한 파라미터를 포함
      const successUrl = new URL(`${window.location.origin}/payments/success`);
      successUrl.searchParams.set('orderId', orderId);
      
      const failUrl = new URL(`${window.location.origin}/payments/fail`);
      failUrl.searchParams.set('orderId', orderId);

      await paymentWidgetRef.current.requestPayment({
        orderId: orderId,
        orderName: orderName,
        successUrl: successUrl.toString(),
        failUrl: failUrl.toString(),
        customerEmail: customerEmail,
        customerName: customerName,
        // amount는 renderPaymentMethods에 이미 전달했으므로 여기서는 생략 가능
        // 하지만 명시적으로 전달하는 것이 안전할 수 있음
      });
      
      console.log('[PaymentModal] 결제 요청 성공');
      // 결제 페이지로 이동하면 모달은 자동으로 닫힘
      // 실제 결제 완료는 PaymentSuccessPage에서 처리됨
    } catch (err) {
      console.error('[PaymentModal] 결제 요청 실패:', err);
      const errorMessage = err.message || '결제 요청에 실패했습니다.';
      
      // 에러 타입별 처리
      if (errorMessage.includes('렌더링되지 않았습니다') || errorMessage.includes('not rendered')) {
        setError('결제 위젯이 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.');
      } else if (errorMessage.includes('네트워크') || errorMessage.includes('network')) {
        setError('네트워크 연결에 문제가 있습니다. 인터넷 연결을 확인해주세요.');
      } else if (errorMessage.includes('타임아웃') || errorMessage.includes('timeout')) {
        setError('요청 시간이 초과되었습니다. 다시 시도해주세요.');
      } else {
        setError(errorMessage);
      }
      
      onError?.(err);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="결제하기">
      <div className="space-y-6 p-4">
        {/* 주문 정보 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">주문번호</span>
            <span className="text-sm font-medium">{orderId}</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">주문명</span>
            <span className="text-sm font-medium">{orderName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">결제 금액</span>
            <span className="text-lg font-bold text-blue-600">
              {amount?.toLocaleString()}원
            </span>
          </div>
        </div>

        {/* 결제 위젯 */}
        {/* DOM 요소는 항상 렌더링 (위젯 로드를 위해) */}
        <div 
          ref={paymentMethodContainerRef}
          id="payment-method-widget" 
          className="min-h-[200px]"
        >
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">결제 위젯을 불러오는 중...</span>
            </div>
          )}
        </div>
        <div 
          ref={agreementContainerRef}
          id="agreement-widget" 
          className="min-h-[100px]"
        ></div>
        
        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-600 font-medium mb-2">{error}</p>
            <div className="text-xs text-red-500 space-y-1 mt-3">
              <p className="font-semibold mb-2 text-base">🔧 401 에러 해결 방법 (필수):</p>
              <div className="bg-white rounded p-3 mt-2 space-y-2">
                <p className="font-semibold">1. 토스 페이먼츠 대시보드 확인</p>
                <p className="pl-2">→ https://developers.tosspayments.com 로그인</p>
                <p className="pl-2">→ "내 상점" → "상점 정보" → "연동 키" 메뉴</p>
                
                <p className="font-semibold mt-3">2. 클라이언트 키 확인</p>
                <p className="pl-2">→ <strong className="text-red-600">본인의 실제 클라이언트 키</strong>를 복사</p>
                <p className="pl-2">→ 형식: test_ck_... 또는 live_ck_... (시크릿 키 아님!)</p>
                <p className="pl-2">→ 현재 사용 중인 키: <code className="bg-gray-100 px-1 rounded">{clientKey?.substring(0, 20)}...</code></p>
                
                <p className="font-semibold mt-3">3. 상점 상태 확인</p>
                <p className="pl-2">→ 상점 상태가 <strong className="text-green-600">"활성화"</strong>인지 확인</p>
                <p className="pl-2">→ "승인 대기" 또는 "비활성화" 상태면 문제 발생</p>
                
                <p className="font-semibold mt-3">4. 키 재설정</p>
                <p className="pl-2">→ frontend/.env 파일 열기</p>
                <p className="pl-2">→ VITE_TOSS_CLIENT_KEY=본인의_실제_클라이언트_키</p>
                <p className="pl-2">→ <strong className="text-red-600">공백 없이</strong> 설정</p>
                
                <p className="font-semibold mt-3">5. 개발 서버 재시작</p>
                <p className="pl-2">→ 환경 변수는 서버 시작 시에만 로드됨</p>
                <p className="pl-2">→ 터미널에서 Ctrl+C 후 npm run dev 재실행</p>
              </div>
              <p className="mt-3 text-orange-600 font-semibold">⚠️ 중요: env.example의 키는 예시입니다. 반드시 본인의 실제 클라이언트 키를 사용해야 합니다!</p>
              <p className="mt-2 text-blue-600">💡 키가 올바른데도 401 에러가 발생하면:</p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li>토스 페이먼츠 대시보드에서 클라이언트 키를 재생성해보세요</li>
                <li>상점 상태가 "활성화"인지 확인하세요</li>
                <li>테스트 모드/실제 모드 설정을 확인하세요</li>
                <li>키가 만료되지 않았는지 확인하세요</li>
              </ul>
            </div>
          </div>
        )}

        {/* 결제 버튼 */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handlePayment}
            disabled={isLoading || !isWidgetReady || !!error}
            className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '위젯 로드 중...' : !isWidgetReady ? '위젯 준비 중...' : `${amount?.toLocaleString()}원 결제하기`}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default PaymentModal;

