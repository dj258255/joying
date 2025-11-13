/**
 * Push Notification Service
 * 브라우저 푸시 알림 서비스
 */

import { pushApi } from '../api/pushApi';

/**
 * VAPID 공개키를 Base64 URL-safe 형식에서 Uint8Array로 변환
 * @param {string} base64String - Base64 URL-safe 문자열 또는 일반 Base64 문자열
 * @returns {Uint8Array}
 */
function urlBase64ToUint8Array(base64String) {
  if (!base64String || typeof base64String !== 'string') {
    throw new Error('유효하지 않은 Base64 문자열입니다.');
  }

  try {
    // 공백 제거 및 정리
    let cleaned = base64String.trim();
    
    if (!cleaned) {
      throw new Error('빈 문자열입니다.');
    }

    // Base64 유효성 검증 (Base64 문자만 포함하는지 확인)
    const base64Regex = /^[A-Za-z0-9+\/_-]*={0,2}$/;
    if (!base64Regex.test(cleaned)) {
      console.error('[PushNotificationService] 유효하지 않은 Base64 문자 발견:', {
        input: cleaned.substring(0, 50) + '...',
        length: cleaned.length,
        firstChar: cleaned[0],
        lastChar: cleaned[cleaned.length - 1]
      });
      throw new Error('유효하지 않은 Base64 문자입니다.');
    }

    // URL-safe Base64인지 확인 (+, / 대신 -, _ 사용)
    const hasUrlSafeChars = cleaned.includes('-') || cleaned.includes('_');
    const hasStandardChars = cleaned.includes('+') || cleaned.includes('/');

    let base64;
    if (hasUrlSafeChars && !hasStandardChars) {
      // URL-safe Base64: padding 추가 후 변환
      const padding = '='.repeat((4 - cleaned.length % 4) % 4);
      base64 = (cleaned + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');
    } else if (hasStandardChars || (!hasUrlSafeChars && !hasStandardChars)) {
      // 일반 Base64 또는 padding만 필요한 경우
      const padding = '='.repeat((4 - cleaned.length % 4) % 4);
      base64 = cleaned + padding;
    } else {
      // 혼합된 경우 (예상치 못한 경우)
      console.warn('[PushNotificationService] 혼합된 Base64 형식 감지, URL-safe로 처리:', {
        input: cleaned.substring(0, 50) + '...',
        hasUrlSafeChars,
        hasStandardChars
      });
      const padding = '='.repeat((4 - cleaned.length % 4) % 4);
      base64 = (cleaned + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');
    }

    // Base64 디코딩
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    // 변환 결과 검증 및 로깅
    console.log('[PushNotificationService] VAPID 키 변환 완료:', {
      inputLength: base64String.length,
      outputLength: outputArray.length,
      firstByte: outputArray[0],
      lastByte: outputArray[outputArray.length - 1],
      isValidLength: outputArray.length === 65 || outputArray.length === 87,
      isUncompressed: outputArray[0] === 0x04,
      preview: Array.from(outputArray.slice(0, 10))
    });
    
    return outputArray;
  } catch (error) {
    console.error('[PushNotificationService] Base64 디코딩 실패:', {
      error: error.message,
      input: base64String.substring(0, 50) + '...',
      length: base64String.length,
      inputType: typeof base64String
    });
    throw new Error(`Base64 디코딩 실패: ${error.message}`);
  }
}

/**
 * 모바일 환경 감지
 * @returns {Object} 모바일 환경 정보
 */
function detectMobileEnvironment() {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;

  // iOS 감지
  const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;

  // Android 감지
  const isAndroid = /android/i.test(userAgent);

  // 삼성 인터넷 브라우저 감지
  const isSamsungBrowser = /SamsungBrowser/i.test(userAgent);

  // 모바일 브라우저 감지
  const isMobile = isIOS || isAndroid || /Mobile|mini|Fennec|Android|iP(ad|od|hone)/.test(userAgent);

  // iOS PWA 모드 감지 (홈 화면에 추가된 경우)
  const isIOSPWA = isIOS && window.navigator.standalone === true;

  return {
    isIOS,
    isAndroid,
    isMobile,
    isIOSPWA,
    isSamsungBrowser,
    userAgent
  };
}

/**
 * 브라우저가 푸시 알림을 지원하는지 확인
 * @returns {boolean}
 */
export function isPushNotificationSupported() {
  const mobileEnv = detectMobileEnvironment();

  // 브라우저의 Web Push API 지원 확인
  const isSupported = (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );

  // iOS Safari 특별 처리 (iOS 16.4+ 지원하지만 PWA 모드 필수)
  if (mobileEnv.isIOS) {
    const isStandalone = window.navigator.standalone === true ||
                        window.matchMedia('(display-mode: standalone)').matches;

    console.log('[PushNotificationService] iOS 푸시 알림 지원 확인:', {
      ...mobileEnv,
      serviceWorker: 'serviceWorker' in navigator,
      pushManager: 'PushManager' in window,
      notification: 'Notification' in window,
      isStandalone,
      isPWAMode: isStandalone,
      isSupported: isSupported && isStandalone,
      note: isStandalone
        ? 'iOS Safari PWA 모드 - 푸시 알림 지원됨 (iOS 16.4+)'
        : 'iOS Safari 일반 브라우저 모드 - 푸시 알림 미지원. 홈 화면에 추가하여 PWA로 사용해야 합니다.'
    });

    // iOS에서는 PWA 모드일 때만 지원
    return isSupported && isStandalone;
  }

  // 브라우저 타입 판별
  let browserNote = 'Desktop 브라우저 - 정상 지원';
  if (mobileEnv.isAndroid) {
    if (mobileEnv.isSamsungBrowser) {
      browserNote = 'Android 삼성 인터넷 브라우저 - 정상 지원';
    } else {
      browserNote = 'Android Chrome/Edge/기타 브라우저 - 정상 지원';
    }
  }

  console.log('[PushNotificationService] 푸시 알림 지원 확인:', {
    ...mobileEnv,
    serviceWorker: 'serviceWorker' in navigator,
    pushManager: 'PushManager' in window,
    notification: 'Notification' in window,
    isSupported,
    browserNote
  });

  return isSupported;
}

/**
 * 푸시 알림 권한 상태 확인
 * @returns {Promise<NotificationPermission>}
 */
export async function getNotificationPermission() {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * 푸시 알림 권한 요청
 * @returns {Promise<NotificationPermission>}
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    throw new Error('이 브라우저는 알림을 지원하지 않습니다.');
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    throw new Error('알림 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용해주세요.');
  }

  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Service Worker 등록
 * @returns {Promise<ServiceWorkerRegistration>}
 */
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    throw new Error('이 브라우저는 Service Worker를 지원하지 않습니다.');
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/'
    });
    console.log('[PushNotificationService] Service Worker 등록 성공:', registration.scope);
    return registration;
  } catch (error) {
    console.error('[PushNotificationService] Service Worker 등록 실패:', error);
    throw error;
  }
}

/**
 * 푸시 알림 구독 생성
 * @param {ServiceWorkerRegistration} registration - Service Worker 등록 객체
 * @param {string} vapidPublicKey - VAPID 공개키
 * @returns {Promise<PushSubscription>}
 */
export async function subscribeToPush(registration, vapidPublicKey) {
  try {
    // VAPID 키 변환 및 검증
    const keyArray = urlBase64ToUint8Array(vapidPublicKey);
    
    // Uint8Array를 ArrayBuffer로 변환 (일부 브라우저에서 필요할 수 있음)
    const keyBuffer = keyArray.buffer.slice(keyArray.byteOffset, keyArray.byteOffset + keyArray.byteLength);
    
    // 모바일 환경 정보
    const mobileEnv = detectMobileEnvironment();

    console.log('[PushNotificationService] 푸시 구독 시도:', {
      vapidKeyLength: vapidPublicKey.length,
      keyArrayLength: keyArray.length,
      keyBufferLength: keyBuffer.byteLength,
      firstByte: keyArray[0],
      lastByte: keyArray[keyArray.length - 1],
      keyArrayPreview: Array.from(keyArray.slice(0, 10)),
      registrationScope: registration.scope,
      registrationActive: registration.active !== null,
      registrationActiveState: registration.active?.state,
      pushManagerSupported: 'PushManager' in window,
      isSecureContext: window.isSecureContext,
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      ...mobileEnv,
      browser: navigator.userAgent
    });

    // 기존 구독 확인 및 해제 (VAPID 키 불일치 문제 해결)
    // 브라우저는 동일한 도메인에서 하나의 VAPID 키만 허용하므로,
    // 이전에 다른 VAPID 키로 구독한 경우 새로운 키로 구독할 수 없음
    let existingSubscription;
    try {
      existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        console.log('[PushNotificationService] 기존 구독 발견:', {
          endpoint: existingSubscription.endpoint?.substring(0, 50) + '...',
          expirationTime: existingSubscription.expirationTime,
          options: existingSubscription.options
        });
        
        // 기존 구독이 있으면 먼저 해제
        try {
          console.log('[PushNotificationService] 기존 구독 해제 중...');
          const unsubscribeResult = await existingSubscription.unsubscribe();
          console.log('[PushNotificationService] 기존 구독 해제 완료:', unsubscribeResult);
          
          // 해제 후 대기 (브라우저가 구독 정보를 정리할 시간 제공)
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // 해제 후 다시 확인 (구독이 완전히 제거되었는지 확인)
          const remainingSubscription = await registration.pushManager.getSubscription();
          if (remainingSubscription) {
            console.warn('[PushNotificationService] 구독 해제 후에도 구독이 남아있음. 강제 재시도...');
            // 브라우저 캐시 문제일 수 있으므로 추가 대기
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (unsubscribeError) {
          console.warn('[PushNotificationService] 기존 구독 해제 실패:', {
            error: unsubscribeError.message,
            errorName: unsubscribeError.name,
            note: '구독이 만료되었거나 이미 제거되었을 수 있습니다.'
          });
          // 해제 실패해도 계속 진행 (기존 구독이 만료되었을 수 있음)
        }
      } else {
        console.log('[PushNotificationService] 기존 구독이 없습니다. 새로 구독합니다.');
      }
    } catch (getSubscriptionError) {
      console.warn('[PushNotificationService] 기존 구독 조회 실패:', {
        error: getSubscriptionError.message,
        errorName: getSubscriptionError.name,
        note: '새로 구독을 시도합니다.'
      });
      // 조회 실패해도 계속 진행 (새로 구독 시도)
    }

    // 푸시 구독 생성 시도
    // applicationServerKey는 Uint8Array 또는 ArrayBuffer를 받을 수 있음
    // 참고: Web Push API는 VAPID 공개키를 압축되지 않은 EC 공개키 형식 (65바이트)으로 요구함
    let subscription;
    
    // PushManager의 지원 상태 확인
    if (!registration.pushManager) {
      throw new Error('PushManager가 지원되지 않습니다.');
    }

    // 구독 생성 전 추가 대기 (브라우저가 이전 구독을 완전히 정리할 시간 제공)
    if (existingSubscription) {
      console.log('[PushNotificationService] 기존 구독 해제 후 추가 대기 중...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    try {
      // 먼저 Uint8Array로 시도
      console.log('[PushNotificationService] 푸시 구독 생성 시도 (Uint8Array)...');
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyArray
      });
      console.log('[PushNotificationService] 푸시 구독 생성 성공 (Uint8Array)');
    } catch (error1) {
      console.warn('[PushNotificationService] Uint8Array로 구독 실패:', {
        error: error1.message,
        errorName: error1.name,
        errorStack: error1.stack
      });
      
      // 추가 대기 후 재시도
      console.log('[PushNotificationService] 잠시 대기 후 재시도...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        // ArrayBuffer로 재시도
        console.log('[PushNotificationService] 푸시 구독 생성 시도 (ArrayBuffer)...');
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyBuffer
        });
        console.log('[PushNotificationService] 푸시 구독 생성 성공 (ArrayBuffer)');
      } catch (error2) {
        console.error('[PushNotificationService] ArrayBuffer로도 구독 실패:', {
          error: error2.message,
          errorName: error2.name,
          errorStack: error2.stack
        });
        
        // 최종 시도: Uint8Array로 다시 시도 (브라우저가 정리되었을 수 있음)
        console.log('[PushNotificationService] 최종 시도 (Uint8Array)...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        try {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: keyArray
          });
          console.log('[PushNotificationService] 푸시 구독 생성 성공 (최종 시도)');
        } catch (error3) {
          console.error('[PushNotificationService] 모든 구독 시도 실패:', {
            error1: error1.message,
            error2: error2.message,
            error3: error3.message,
            suggestion: '브라우저 설정에서 알림 권한을 제거하고 다시 허용해보세요. 또는 브라우저를 재시작해보세요.'
          });
          throw error3;
        }
      }
    }
    
    console.log('[PushNotificationService] 푸시 구독 생성 성공:', {
      endpoint: subscription.endpoint,
      expirationTime: subscription.expirationTime,
      keys: {
        p256dh: subscription.getKey('p256dh') ? 'present' : 'missing',
        auth: subscription.getKey('auth') ? 'present' : 'missing'
      }
    });
    return subscription;
  } catch (error) {
    console.error('[PushNotificationService] 푸시 구독 생성 실패:', {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      vapidKeyLength: vapidPublicKey.length,
      registrationScope: registration?.scope,
      registrationActive: registration?.active !== null,
      registrationActiveState: registration?.active?.state,
      isSecureContext: window.isSecureContext,
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      browser: navigator.userAgent,
      possibleCauses: [
        'VAPID 키 쌍 불일치 (백엔드 개인키 확인 필요)',
        '브라우저 푸시 서비스 연결 실패 (FCM/autopush)',
        '네트워크 또는 방화벽 문제',
        '브라우저 호환성 문제',
        'localhost 개발 환경 제약'
      ]
    });
    throw error;
  }
}

/**
 * 푸시 구독 정보를 서버에 등록
 * @param {PushSubscription} subscription - 푸시 구독 객체
 * @returns {Promise<void>}
 */
export async function registerSubscriptionToServer(subscription) {
  try {
    const subscriptionData = {
      endpoint: subscription.endpoint,
      p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
      auth: arrayBufferToBase64(subscription.getKey('auth')),
      userAgent: navigator.userAgent
    };

    await pushApi.subscribe(subscriptionData);
    console.log('[PushNotificationService] 서버에 구독 정보 등록 성공');
  } catch (error) {
    console.error('[PushNotificationService] 서버에 구독 정보 등록 실패:', error);
    throw error;
  }
}

/**
 * 푸시 구독 해제
 * @param {ServiceWorkerRegistration} registration - Service Worker 등록 객체
 * @param {string} endpoint - 구독 해제할 엔드포인트 URL
 * @returns {Promise<void>}
 */
export async function unsubscribeFromPush(registration, endpoint) {
  try {
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      console.log('[PushNotificationService] 푸시 구독 해제 성공 (로컬)');
    }

    // 서버에도 구독 해제 요청
    if (endpoint) {
      await pushApi.unsubscribe(endpoint);
      console.log('[PushNotificationService] 서버에 구독 해제 요청 성공');
    }
  } catch (error) {
    console.error('[PushNotificationService] 푸시 구독 해제 실패:', error);
    throw error;
  }
}

/**
 * ArrayBuffer를 Base64 문자열로 변환
 * @param {ArrayBuffer} buffer - ArrayBuffer
 * @returns {string} Base64 문자열
 */
function arrayBufferToBase64(buffer) {
  if (!buffer) return '';
  
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * 현재 푸시 구독 정보 조회
 * @param {ServiceWorkerRegistration} registration - Service Worker 등록 객체
 * @returns {Promise<PushSubscription|null>}
 */
export async function getCurrentSubscription(registration) {
  try {
    const subscription = await registration.pushManager.getSubscription();
    return subscription;
  } catch (error) {
    console.error('[PushNotificationService] 구독 정보 조회 실패:', error);
    return null;
  }
}

/**
 * 푸시 알림 초기화 및 구독
 * @returns {Promise<PushSubscription|null>} 구독 객체 또는 null
 */
export async function initializePushNotification() {
  try {
    // 브라우저 지원 확인
    if (!isPushNotificationSupported()) {
      console.warn('[PushNotificationService] 브라우저가 푸시 알림을 지원하지 않습니다.');
      return null;
    }

    // 권한 확인 및 요청
    const permission = await getNotificationPermission();
    if (permission !== 'granted') {
      console.log('[PushNotificationService] 알림 권한이 없습니다. 권한을 요청합니다...');
      const newPermission = await requestNotificationPermission();
      if (newPermission !== 'granted') {
        console.warn('[PushNotificationService] 알림 권한이 거부되었습니다.');
        return null;
      }
    }

    // Service Worker 등록
    const registration = await registerServiceWorker();
    
    // Service Worker 활성화 대기
    if (registration.installing) {
      console.log('[PushNotificationService] Service Worker 설치 중...');
      await new Promise((resolve) => {
        registration.installing.addEventListener('statechange', (event) => {
          if (event.target.state === 'installed') {
            resolve();
          }
        });
      });
    }
    
    if (registration.waiting) {
      console.log('[PushNotificationService] Service Worker 대기 중...');
      // 새 Service Worker가 대기 중이면 활성화
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      await new Promise((resolve) => {
        registration.waiting.addEventListener('statechange', (event) => {
          if (event.target.state === 'activated') {
            resolve();
          }
        });
      });
    }
    
    // Service Worker 활성화 대기 (최대 5초 대기)
    if (!registration.active) {
      console.log('[PushNotificationService] Service Worker 활성화 대기...');
      try {
        await Promise.race([
          navigator.serviceWorker.ready,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Service Worker 활성화 시간 초과')), 5000)
          )
        ]);
      } catch (error) {
        console.warn('[PushNotificationService] Service Worker 활성화 대기 시간 초과:', error.message);
      }
    }

    // Service Worker가 활성화될 때까지 대기
    let activeWorker = registration.active;
    if (!activeWorker) {
      console.log('[PushNotificationService] Service Worker 활성화 대기 (폴링)...');
      const maxWait = 5000; // 최대 5초 대기
      const startTime = Date.now();
      while (!activeWorker && (Date.now() - startTime) < maxWait) {
        await new Promise(resolve => setTimeout(resolve, 100));
        activeWorker = registration.active;
      }
    }

    if (!activeWorker) {
      throw new Error('Service Worker가 활성화되지 않았습니다.');
    }

    console.log('[PushNotificationService] Service Worker 상태 확인:', {
      scope: registration.scope,
      active: registration.active !== null,
      activeState: registration.active?.state,
      installing: registration.installing !== null,
      waiting: registration.waiting !== null,
      updateViaCache: registration.updateViaCache,
      pushManager: registration.pushManager !== null
    });

    // 기존 구독 확인 (하지만 VAPID 키 불일치 문제 해결을 위해 재구독 처리)
    // 참고: 브라우저는 동일한 도메인에서 하나의 VAPID 키만 허용하므로,
    // VAPID 키가 변경되면 기존 구독을 해제하고 새로 구독해야 함
    // subscribeToPush 함수에서 기존 구독 해제를 처리하므로 여기서는 재구독을 시도함

    // VAPID 공개키 조회
    const vapidPublicKey = await pushApi.getVapidPublicKey();
    if (!vapidPublicKey || typeof vapidPublicKey !== 'string') {
      console.error('[PushNotificationService] VAPID 공개키 유효성 검증 실패:', {
        vapidPublicKey,
        type: typeof vapidPublicKey,
        isEmpty: !vapidPublicKey
      });
      throw new Error('VAPID 공개키를 가져올 수 없거나 유효하지 않습니다.');
    }

    // VAPID 공개키 유효성 검증
    if (vapidPublicKey.trim().length === 0) {
      throw new Error('VAPID 공개키가 비어있습니다.');
    }

    console.log('[PushNotificationService] VAPID 공개키 수신:', {
      length: vapidPublicKey.length,
      preview: vapidPublicKey.substring(0, 50) + '...',
      hasPlus: vapidPublicKey.includes('+'),
      hasSlash: vapidPublicKey.includes('/'),
      hasDash: vapidPublicKey.includes('-'),
      hasUnderscore: vapidPublicKey.includes('_')
    });

    // 환경 확인
    const isLocalhost = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.hostname === '[::1]';
    const isSecureContext = window.isSecureContext;
    const protocol = window.location.protocol;

    console.log('[PushNotificationService] 환경 확인:', {
      isLocalhost,
      isSecureContext,
      protocol,
      hostname: window.location.hostname,
      port: window.location.port,
      fullUrl: window.location.href
    });

    // localhost가 아니고 HTTPS가 아닌 경우 경고
    if (!isLocalhost && protocol !== 'https:') {
      console.warn('[PushNotificationService] HTTPS가 아닌 환경에서 푸시 알림이 작동하지 않을 수 있습니다.');
    }

    // 새 구독 생성 (재시도 로직 포함)
    let subscription;
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 1000; // 1초

    while (retryCount < maxRetries) {
      try {
        subscription = await subscribeToPush(registration, vapidPublicKey);
        break; // 성공하면 루프 종료
      } catch (error) {
        retryCount++;
        console.warn(`[PushNotificationService] 푸시 구독 시도 ${retryCount}/${maxRetries} 실패:`, error.message);
        
        if (retryCount >= maxRetries) {
          // 최대 재시도 횟수 초과
          console.error('[PushNotificationService] 푸시 구독 최대 재시도 횟수 초과:', {
            error: error.message,
            retryCount,
            possibleCauses: [
              '백엔드 VAPID 개인키가 프론트엔드 공개키와 다른 키 쌍일 수 있습니다.',
              '브라우저 푸시 서비스(FCM/autopush) 연결에 실패했습니다.',
              '네트워크 또는 방화벽 설정 문제일 수 있습니다.',
              '브라우저 버전 또는 설정 문제일 수 있습니다.',
              'localhost 개발 환경에서 제한이 있을 수 있습니다.'
            ]
          });
          throw error;
        }
        
        // 재시도 전 대기
        await new Promise(resolve => setTimeout(resolve, retryDelay * retryCount));
      }
    }

    // 서버에 구독 등록
    await registerSubscriptionToServer(subscription);

    console.log('[PushNotificationService] 푸시 알림 초기화 완료');
    return subscription;
  } catch (error) {
    console.error('[PushNotificationService] 푸시 알림 초기화 실패:', {
      error: error.message,
      errorName: error.name,
      errorStack: error.stack,
      possibleCauses: [
        '브라우저 푸시 서비스(FCM/autopush) 연결 실패 - 네트워크 또는 방화벽 문제일 수 있습니다.',
        '브라우저 설정에서 알림이 차단되었을 수 있습니다.',
        'localhost 개발 환경에서 일부 브라우저 버전에서 제한이 있을 수 있습니다.',
        '브라우저 확장 프로그램이나 보안 소프트웨어가 푸시 서비스를 차단했을 수 있습니다.',
        '브라우저 캐시 또는 쿠키 문제일 수 있습니다.'
      ],
      solutions: [
        '브라우저 설정에서 알림 권한을 제거하고 다시 허용해보세요.',
        '브라우저 캐시와 쿠키를 삭제한 후 다시 시도해보세요.',
        '브라우저를 재시작해보세요.',
        '다른 브라우저에서 테스트해보세요.',
        'HTTPS 환경에서 테스트해보세요 (localhost는 자동으로 HTTPS로 간주됨).',
        '브라우저 확장 프로그램을 비활성화하고 다시 시도해보세요.',
        '방화벽 또는 네트워크 설정에서 FCM/autopush 서비스가 차단되지 않았는지 확인하세요.'
      ]
    });
    return null;
  }
}

