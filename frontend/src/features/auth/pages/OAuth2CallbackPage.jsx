/**
 * OAuth2CallbackPage Component
 * OAuth2 로그인 콜백 처리 페이지
 */

import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const OAuth2CallbackPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const loginStatus = searchParams.get('login');
      
      console.log('🔍 로그인 상태:', loginStatus);
      
      if (loginStatus === 'success') {
        // auth/me API 호출로 로그인 상태 확인
        const success = await login();
        
        if (success) {
          // 로그인 성공 - 홈으로 이동
          navigate('/', { replace: true });
        } else {
          // 로그인 실패 - 로그인 페이지로 이동
          navigate('/login', { replace: true });
        }
      } else {
        // 로그인 실패 - 로그인 페이지로 이동
        console.error('로그인 실패');
        navigate('/login', { replace: true });
      }
    };

    handleCallback();
  }, [searchParams, navigate, login]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">로그인 처리 중...</p>
      </div>
    </div>
  );
};

export default OAuth2CallbackPage;
