/**
 * Axios Interceptors
 * Axios 인터셉터 설정
 */

import { axiosInstance } from './axiosInstance';

/**
 * 토큰 갱신 인터셉터
 */
export const setupTokenRefreshInterceptor = () => {
  axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        
        try {
          const refreshToken = localStorage.getItem('refreshToken');
          if (refreshToken) {
            const response = await axiosInstance.post('/auth/refresh', {
              refreshToken
            });
            
            const { accessToken } = response.data;
            localStorage.setItem('accessToken', accessToken);
            
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return axiosInstance(originalRequest);
          }
        } catch (refreshError) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
      
      return Promise.reject(error);
    }
  );
};

/**
 * 로딩 상태 인터셉터
 */
export const setupLoadingInterceptor = () => {
  let requestCount = 0;
  
  axiosInstance.interceptors.request.use(
    (config) => {
      requestCount++;
      // TODO: 전역 로딩 상태 관리
      return config;
    },
    (error) => {
      requestCount--;
      return Promise.reject(error);
    }
  );
  
  axiosInstance.interceptors.response.use(
    (response) => {
      requestCount--;
      if (requestCount === 0) {
        // TODO: 전역 로딩 상태 해제
      }
      return response;
    },
    (error) => {
      requestCount--;
      if (requestCount === 0) {
        // TODO: 전역 로딩 상태 해제
      }
      return Promise.reject(error);
    }
  );
};
