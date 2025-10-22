/**
 * AuthTokenHandler Component
 * 인증 토큰 자동 갱신 및 관리 컴포넌트
 */

import React, { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children - 자식 컴포넌트
 */
const AuthTokenHandler = ({ children }) => {
  const { refreshToken, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      // 토큰 자동 갱신 로직
      const interval = setInterval(() => {
        refreshToken();
      }, 50 * 60 * 1000); // 50분마다 갱신

      return () => clearInterval(interval);
    }
  }, [isAuthenticated, refreshToken]);

  return <>{children}</>;
};

export default AuthTokenHandler;
