/**
 * Axios Instance Configuration
 * 쿠키 기반 인증을 위한 Axios 설정
 *
 * 개발 환경: Vite 프록시를 통해 /api/v1 → VITE_BACKEND_TARGET (기본: http://localhost:8080)
 * 프로덕션 환경: Nginx가 /api/v1 → 백엔드 서버로 라우팅
 *
 * 환경 변수 설정 (env.example 참고):
 * - VITE_API_BASE_URL=/api/v1 (상대 경로, Vite 프록시 사용)
 * - VITE_BACKEND_TARGET=http://localhost:8080 (Vite 프록시 타겟)
 */

import axios from 'axios';

// 환경별 baseURL 설정
// env.example 참고: VITE_API_BASE_URL=/api/v1 (Vite 프록시 사용)
// Vite 프록시 설정(vite.config.js)에서 /api → VITE_BACKEND_TARGET으로 전달
const getBaseURL = () => {
  // 환경 변수가 설정된 경우 사용 (env.example: VITE_API_BASE_URL=/api/v1)
  // Vite 프록시를 통해 백엔드로 전달됨
  const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
  
  // 디버깅: baseURL 확인
  console.log('[axiosInstance] baseURL 설정:', {
    'import.meta.env.VITE_API_BASE_URL': import.meta.env.VITE_API_BASE_URL,
    'import.meta.env.DEV': import.meta.env.DEV,
    'import.meta.env.MODE': import.meta.env.MODE,
    '최종 baseURL': baseURL
  });
  
  return baseURL;
};

// 기본 axios 인스턴스 생성
const baseURL = getBaseURL();
export const axiosInstance = axios.create({
  // 개발 환경: /api/v1 (Vite 프록시 → VITE_BACKEND_TARGET)
  // 프로덕션 환경: /api/v1 (Nginx 프록시)
  baseURL: baseURL,
  timeout: 10000,
  withCredentials: true, // 쿠키 자동 전송 (SameSite=Lax/Strict 지원)
  headers: {
    'Content-Type': 'application/json'
  }
});

// 리프레시 중복 호출 방지 플래그
let isRefreshing = false;
let isRedirectingToLogin = false;

const shouldSuppressRedirect = () => {
  try {
    const path = window.location?.pathname || '';
    // 로그인/회원가입/콜백 페이지에서는 리다이렉트 금지
    if (path.startsWith('/login') || path.includes('/oauth2') || path.startsWith('/register')) return true;
    // 홈 페이지와 제품 목록 페이지만 공개 (제품 상세는 제외)
    if (path === '/' || path === '/home') return true;
    if (path === '/products') return true; // 목록만 공개, 상세(/products/:id)는 로그인 필요
    return false;
  } catch (_) {
    return false;
  }
};

// baseURL에 /api/v1가 이미 포함되어 있으므로 경로만 반환
const getRefreshEndpoint = () => {
  return '/auth/refresh';
};

// 요청 인터셉터
axiosInstance.interceptors.request.use(
  (config) => {
    // 쿠키 기반 인증 사용 (withCredentials: true로 자동 전송)
    // localStorage 토큰은 폴백으로만 사용 (선택적)
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    
    // 디버깅용 로그 (간소화)
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, {
      hasCredentials: config.withCredentials,
      hasAuthHeader: !!config.headers.Authorization,
      isRetry: config._retry || false
    });
    
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// 응답 인터셉터
axiosInstance.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ${response.status} ${response.config.url}`);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // 401 에러이고 토큰 갱신이 아직 시도되지 않은 경우
    if (error.response?.status === 401) {
      // 리프레시 엔드포인트 자체에서 401이면 더 이상 재시도하지 않음
      const refreshEndpoint = getRefreshEndpoint();
      if (originalRequest?.url?.includes(refreshEndpoint)) {
        return Promise.reject(error);
      }

      // 이미 재시도된 요청이면 중단
      if (originalRequest._retry) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      // 다른 요청이 리프레시 중이면 중복 리프레시 방지
      if (isRefreshing) {
        return Promise.reject(error);
      }

      try {
        isRefreshing = true;
        // 인터셉터를 우회하기 위해 기본 axios로 직접 호출
        // baseURL이 절대 경로면 그대로 사용, 상대 경로면 현재 도메인 기준으로 변환
        const baseURL = axiosInstance.defaults.baseURL || '/api/v1';
        let refreshUrl;
        
        if (baseURL.startsWith('http')) {
          // 절대 경로: http://localhost:8080/api/v1 + /auth/refresh
          refreshUrl = `${baseURL}${refreshEndpoint}`;
        } else {
          // 상대 경로: /api/v1 + /auth/refresh → 현재 도메인 기준으로 변환
          // baseURL과 refreshEndpoint를 결합하여 절대 URL 생성
          refreshUrl = `${window.location.origin}${baseURL}${refreshEndpoint}`;
        }
        
        console.log('[Token Refresh] URL:', refreshUrl);
        const response = await axios.post(refreshUrl, null, { withCredentials: true });

        const accessToken = response.data?.accessToken;
        if (accessToken) {
          localStorage.setItem('accessToken', accessToken);
        }
        
        // 쿠키 확인 (백엔드가 Set-Cookie 헤더로 access_token 쿠키를 설정했는지 확인)
        const cookies = document.cookie;
        const hasAccessTokenCookie = cookies.includes('access_token=');
        
        if (!hasAccessTokenCookie) {
          console.warn('[Token Refresh] 쿠키가 설정되지 않았습니다. 백엔드 응답 헤더 확인 필요.');
          // 쿠키가 없으면 Authorization 헤더를 사용 (폴백)
          if (accessToken) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            console.log('[Token Refresh] 쿠키가 설정되지 않았습니다. Authorization 헤더를 사용합니다.');
          }
        } else {
          console.log('[Token Refresh] 쿠키가 설정되었습니다. 쿠키 기반 인증 사용.');
        }
        
        // originalRequest 재요청 시 baseURL 중복 방지
        // error.config.url은 이미 baseURL이 결합된 전체 경로일 수 있음
        const retryConfig = { 
          ...originalRequest,
          _retry: true, // 재요청 플래그 설정
          withCredentials: true // 쿠키 전송 보장
        };
        
        // originalRequest.url에서 baseURL 제거 (중복 방지)
        if (retryConfig.url) {
          // 이미 baseURL이 포함된 경로인지 확인
          // 예: /api/v1/auth/me → /auth/me
          if (retryConfig.url.startsWith('/api/v1/')) {
            retryConfig.url = retryConfig.url.replace(/^\/api\/v1/, '');
          }
          // 절대 URL인 경우 (프로덕션에서 발생할 수 있음)
          else if (retryConfig.url.includes('/api/v1/')) {
            const urlObj = new URL(retryConfig.url, window.location.origin);
            retryConfig.url = urlObj.pathname.replace(/^\/api\/v1/, '');
          }
        }
        
        // baseURL 초기화 (axiosInstance의 baseURL 사용)
        delete retryConfig.baseURL;
        
        console.log('[Token Refresh] Retry URL:', retryConfig.url, {
          hasAuthHeader: !!retryConfig.headers.Authorization,
          hasCredentials: retryConfig.withCredentials
        });
        // baseURL이 포함되지 않은 순수 경로로 재요청
        return axiosInstance(retryConfig);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        // 로그인 페이지/콜백 등에서는 리다이렉트하지 않음
        if (!shouldSuppressRedirect() && !isRedirectingToLogin) {
          isRedirectingToLogin = true;
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    console.error('[API Response Error]', error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);
