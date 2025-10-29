/**
 * AuthContext - 쿠키 기반 인증 컨텍스트
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { axiosInstance } from '@/lib/axios/axiosInstance';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // 로그인 상태 확인
  const checkAuthStatus = async () => {
    try {
      const response = await axiosInstance.get('/api/v1/auth/me');
      if (response.status === 200) {
        setUser(response.data);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.log('인증되지 않은 사용자:', error.response?.status);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  // 로그인
  const login = async () => {
    try {
      const response = await axiosInstance.get('/api/v1/auth/me');
      if (response.status === 200) {
        setUser(response.data);
        setIsAuthenticated(true);
        return true;
      }
    } catch (error) {
      console.error('로그인 실패:', error);
      return false;
    }
  };

  // 로그아웃
  const logout = async () => {
    try {
      await axiosInstance.post('/api/v1/auth/logout');
    } catch (error) {
      console.error('로그아웃 API 호출 실패:', error);
    } finally {
      // API 호출 성공/실패와 관계없이 로컬 상태 초기화
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  // 토큰 갱신
  const refreshToken = async () => {
    try {
      const response = await axiosInstance.post('/api/v1/auth/refresh');
      if (response.status === 200) {
        return true;
      }
    } catch (error) {
      console.error('토큰 갱신 실패:', error);
      // 토큰 갱신 실패 시 로컬 상태만 초기화 (무한 루프 방지)
      setUser(null);
      setIsAuthenticated(false);
      return false;
    }
  };

  // 컴포넌트 마운트 시 인증 상태 확인
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const value = {
    isAuthenticated,
    user,
    isLoading,
    login,
    logout,
    refreshToken,
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
