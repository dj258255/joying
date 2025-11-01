/**
 * Axios Instance Configuration
 * 쿠키 기반 인증을 위한 Axios 설정
 *
 * 로컬 개발: Vite 프록시를 통해 /api/* → https://k13c202.p.ssafy.io/api/*
 * 운영 배포: Nginx가 /api/* → 백엔드 서버로 라우팅
 */

import axios from 'axios';

// Axios 인스턴스 생성
export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
  withCredentials: true, // 쿠키 자동 전송 (SameSite=Lax/Strict 지원)
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터
axiosInstance.interceptors.request.use(
  (config) => {
    // 쿠키 기반 인증이므로 별도 토큰 헤더 추가 불필요
    console.log('🚀 API 요청:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('❌ 요청 에러:', error);
    return Promise.reject(error);
  }
);

// 응답 인터셉터 (단순화)
axiosInstance.interceptors.response.use(
  (response) => {
    console.log('✅ API 응답:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('❌ 응답 에러:', error.response?.status, error.config?.url);
    return Promise.reject(error);
  }
);

export default axiosInstance;
