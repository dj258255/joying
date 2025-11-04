/**
 * LoadingScreen Component
 * 3D 모델 로딩 화면 (Canvas 외부)
 */

import React, { useState, useEffect } from 'react';
import logo from '@/assets/icons/logo.png';

const LoadingScreen = ({ progress = 0, active = true, loaded = 0, total = 0, onLoadComplete }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [smoothProgress, setSmoothProgress] = useState(0);

  // 부드러운 프로그레스 애니메이션
  useEffect(() => {
    const minDisplayTime = 1500; // 최소 1.5초 동안 로딩 화면 표시
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const minProgress = Math.min((elapsed / minDisplayTime) * 100, 100);
      const targetProgress = Math.max(progress, minProgress);
      
      setSmoothProgress(prev => {
        const diff = targetProgress - prev;
        if (Math.abs(diff) < 0.1) return targetProgress;
        return prev + diff * 0.1; // 부드럽게 증가
      });
      
      if (elapsed < minDisplayTime || smoothProgress < 100) {
        requestAnimationFrame(animate);
      }
    };
    
    const animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [progress, smoothProgress]);

  useEffect(() => {
    // 로딩이 완료되면 부모에게 알림
    if (!active && smoothProgress >= 99) {
      console.log('✅ Loading Complete!');
      setSmoothProgress(100); // 100%로 강제 설정
      
      onLoadComplete?.();
      
      // 0.5초 후에 페이드 아웃
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [active, smoothProgress, onLoadComplete]);

  // 완전히 사라진 후에는 DOM에서 제거
  if (!isVisible && !active) return null;

  return (
    <div 
      className={`fixed inset-0 bg-black z-[10000] flex flex-col items-center justify-center transition-opacity duration-500 ${
        !active ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* 로고 */}
      <div className="mb-8 text-center">
        <img 
          src={logo} 
          alt="빌려joying" 
          className="h-32 w-auto object-contain mx-auto"
        />
      </div>

      {/* 프로그레스 바 */}
      <div className="w-80 h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-white transition-all duration-100 ease-out"
          style={{ width: `${smoothProgress}%` }}
        />
      </div>

      {/* 진행률 퍼센트 */}
      <div className="mt-4 text-white text-2xl font-semibold">
        {Math.round(smoothProgress)}%
      </div>

      {/* 로딩 애니메이션 (점 3개) */}
      <div className="mt-8 flex gap-2">
        <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
};

export default LoadingScreen;

