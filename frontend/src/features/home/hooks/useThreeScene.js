/**
 * useThreeScene Hook
 * Three.js 씬 초기화 및 관리 훅
 */

import { useState, useEffect } from 'react';

export const useThreeScene = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // TODO: Three.js 씬 초기화 로직 구현 예정
    // - 씬, 카메라, 렌더러 설정
    // - 라이트 설정
    // - 성능 최적화 설정
    
    const initScene = async () => {
      try {
        // 모의 로딩 시간
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsLoaded(true);
      } catch (err) {
        setError(err);
      }
    };

    initScene();
  }, []);

  return {
    isLoaded,
    error,
  };
};
