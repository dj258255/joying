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
    // 로그인/회원가입/콜백 및 공개 페이지에서는 리다이렉트 금지
    if (path.startsWith('/login') || path.includes('/oauth2') || path.startsWith('/register')) return true;
    if (path === '/' || path === '/home') return true;
    if (path === '/products' || path.startsWith('/products/')) return true;
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
    // 토큰이 있으면 헤더에 추가
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn('[axiosInstance] accessToken이 없습니다. 인증이 필요할 수 있습니다.');
    }
    
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, {
      hasToken: !!token,
      url: config.url
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
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        
        // originalRequest 재요청 시 baseURL 중복 방지
        // error.config.url은 이미 baseURL이 결합된 전체 경로일 수 있음
        const retryConfig = { ...originalRequest };
        
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
        
        console.log('[Token Refresh] Retry URL:', retryConfig.url);
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
