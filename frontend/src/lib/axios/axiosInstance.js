/**
 * Axios Instance Configuration
 * Axios 인스턴스 설정
 */

import axios from 'axios';

// 기본 axios 인스턴스 생성
export const axiosInstance = axios.create({
  // 개발 환경: /api/v1 (Vite 프록시 사용)
  // 프로덕션 환경: /api/v1 (Nginx 프록시 사용)
  // 모든 엔드포인트는 baseURL에 /api/v1가 포함되어 있으므로 경로만 사용 (예: /auth/me)
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 10000,
  withCredentials: true,
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
    }
    
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
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
          // 상대 경로: /api/v1/auth/refresh → 현재 도메인 기준으로 변환
          refreshUrl = `${window.location.origin}${baseURL}${refreshEndpoint}`;
        }
        
        const response = await axios.post(refreshUrl, null, { withCredentials: true });

        const accessToken = response.data?.accessToken;
        if (accessToken) {
          localStorage.setItem('accessToken', accessToken);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        return axiosInstance(originalRequest);
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
