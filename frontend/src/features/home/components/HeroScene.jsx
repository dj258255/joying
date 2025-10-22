/**
 * HeroScene Component
 * Three.js 히어로 섹션 컴포넌트
 */

import React, { Suspense } from 'react';
// import { Canvas } from '@react-three/fiber';
// import { Environment, OrbitControls } from '@react-three/drei';
// import FloatingObjects from './FloatingObjects';
// import CameraController from './CameraController';
import LoadingOverlay from './LoadingOverlay';

const HeroScene = ({ onCategoryClick }) => {
  return (
    <div className="hero-scene relative w-full h-screen">
      <Suspense fallback={<LoadingOverlay />}>
        {/* TODO: Three.js Canvas 구현 예정 */}
        <div className="flex items-center justify-center h-full bg-gradient-to-br from-primary-50 to-primary-100">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-primary-600 mb-4">빌려joying</h1>
            <p className="text-xl text-gray-600">물건을 빌려주고 빌리는 지역 기반 렌탈 마켓플레이스</p>
          </div>
        </div>
        {/* 
        <Canvas
          camera={{ position: [0, 0, 10], fov: 50 }}
          gl={{ antialias: true, alpha: true }}
          dpr={[1, 2]}
        >
          <Environment preset="city" />
          <FloatingObjects onCategoryClick={onCategoryClick} />
          <CameraController />
        </Canvas>
        */}
      </Suspense>
    </div>
  );
};

export default HeroScene;
