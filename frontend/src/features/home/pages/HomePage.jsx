/**
 * HomePage Component


 * 섹션별 카메라 각도 전환 + Sticky 스크롤
 */



import React, { Suspense, useEffect, useRef, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { useGLTF, Environment, useProgress, Loader } from '@react-three/drei';
import { useNavigate } from 'react-router-dom';

import * as THREE from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ROUTE_PATHS } from '@/shared/constants';
import { useProducts } from '@/features/product/hooks/useProducts';


import LoadingScreen from '../components/LoadingScreen';
import ScrollIndicator from '../components/ScrollIndicator';
import { Section1Hero, Section2Camera, Section3Tent, Section4Gamepad, Section5Triangle, Section6System } from '../sections';

gsap.registerPlugin(ScrollTrigger);

// Draco 디코더 설정 (압축된 GLB 파일 로딩 최적화)
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
dracoLoader.setDecoderConfig({ type: 'js' });
dracoLoader.preload();

// 모델 프리로드 (Draco 압축 지원)
useGLTF.preload('/models/camera.glb');
useGLTF.preload('/models/tent.glb');
useGLTF.preload('/models/gamepad.glb');

/**
 * Progress Tracker - Canvas 내부에서 useProgress를 호출하고 부모에게 전달
 */
const ProgressTracker = ({ onProgressChange }) => {
  const { progress, active, loaded, total, errors } = useProgress();
  
  useEffect(() => {
    console.log('📊 Progress Update:', { progress, active, loaded, total });
    onProgressChange({ progress, active, loaded, total, errors });
  }, [progress, active, loaded, total, errors, onProgressChange]);
  
  return null;
};

/**
 * 3D Model Component with cross-fade transition
 */
const Model3D = ({ animationState, currentModel, currentSection, previousSectionRef }) => {
  // useGLTF로 모델 로드 (suspense 모드로 로딩 추적)
  const cameraModel = useGLTF('/models/camera.glb', true); // suspense: true
  const tentModel = useGLTF('/models/tent.glb', true);
  const gamepadModel = useGLTF('/models/gamepad.glb', true);
  const groupRef = useRef();
  const cameraGroupRef = useRef();
  const tentGroupRef = useRef();
  const gamepadGroupRef = useRef();
  const triangleGroupRef = useRef(); // Section 5 삼각형 대형용

  // Opacity 애니메이션을 위한 ref
  // ✨ 초기값을 0.01로 설정하여 모든 모델을 처음부터 로드 (딜레이 방지)
  const opacityRef = useRef({ camera: 1, tent: 0.01, gamepad: 0.01 });
  
  // 개별 모델 스케일/회전 애니메이션을 위한 ref
  const modelTransformRef = useRef({
    camera: { scale: 1, rotationY: 0 },
    tent: { scale: 0.5, rotationY: 0 },
    gamepad: { scale: 0.5, rotationY: 0 },
  });
  
  // Section 5 각 모델의 개별 회전 상태
  const modelRotationsRef = useRef({
    camera: 0,
    tent: 0,
    gamepad: 0,
  });

  useFrame((state, delta) => {
    // Section 5: 삼각형 대형은 고정, 각 모델만 Y축으로 회전
    if (currentModel === 'all') {
      // Section 6에서는 회전만 스킵 (opacity는 업데이트 필요)
      if (currentSection !== 5) {
        modelRotationsRef.current.camera += delta * 0.3;
        modelRotationsRef.current.tent += delta * 0.3;
        modelRotationsRef.current.gamepad += delta * 0.3;
        
        if (cameraGroupRef.current) {
          cameraGroupRef.current.rotation.y = modelRotationsRef.current.camera;
        }
        if (tentGroupRef.current) {
          tentGroupRef.current.rotation.y = modelRotationsRef.current.tent;
        }
        if (gamepadGroupRef.current) {
          gamepadGroupRef.current.rotation.y = modelRotationsRef.current.gamepad;
        }
      }
    } else {
      // Section 5가 아닐 때는 각 모델의 Y축 회전을 0으로 초기화
      // (일반 모드에서는 modelTransformRef.tent.rotationY가 사용됨)
      if (cameraGroupRef.current && currentModel === 'camera') {
        cameraGroupRef.current.rotation.y = 0;
      }
      if (gamepadGroupRef.current && currentModel === 'gamepad') {
        gamepadGroupRef.current.rotation.y = 0;
      }
      // tent는 modelTransformRef에서 관리하므로 여기서는 제외
    }
    
    // 애니메이션 상태로 위치, 회전, 스케일 업데이트
    if (currentModel === 'all' && triangleGroupRef.current && animationState.current) {
      // Section 5: 삼각형 그룹 전체에 position만 적용 (스크롤 효과)
      // ⚠️ 중요: JSX에서 설정한 position, rotation, scale은 유지하고
      // animationState의 position.y만 추가로 적용하여 스크롤 효과
      const basePosition = [0, 0, 0]; // JSX에서 설정한 기본 position
      triangleGroupRef.current.position.set(
        basePosition[0] + animationState.current.position.x,
        basePosition[1] + animationState.current.position.y,
        basePosition[2] + animationState.current.position.z
      );
    } else if (groupRef.current && animationState.current) {
      // 일반 모드: groupRef 업데이트
      groupRef.current.rotation.set(
        animationState.current.rotation.x,
        animationState.current.rotation.y,
        animationState.current.rotation.z
      );
      groupRef.current.position.set(
        animationState.current.position.x,
        animationState.current.position.y,
        animationState.current.position.z
      );
      groupRef.current.scale.set(
        animationState.current.scale,
        animationState.current.scale,
        animationState.current.scale
      );
    }

    // Opacity 업데이트 (각 모델의 모든 메시에 적용)
    // 모든 모델을 항상 렌더링하여 미리 로드 (visible = true 유지)
    // Section 6일 때는 opacity를 0으로 설정하여 숨김
    const isSection6 = currentSection === 5; // Section 6 (index 5)
    
    if (cameraGroupRef.current) {
      cameraGroupRef.current.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.transparent = true;
          child.material.opacity = isSection6 ? 0 : opacityRef.current.camera;
          child.material.depthWrite = isSection6 ? false : (opacityRef.current.camera > 0.5);
          child.material.needsUpdate = true;
        }
      });
      
      // ✨ 항상 렌더링 (딜레이 방지)
      cameraGroupRef.current.visible = true;
      
      // 삼각형 모드가 아닐 때만 position.z와 scale 조정
      if (currentModel !== 'all') {
        cameraGroupRef.current.position.z = -0.1 * (1 - opacityRef.current.camera);
        // 개별 스케일 적용
        const cameraScale = modelTransformRef.current.camera.scale;
        cameraGroupRef.current.scale.set(cameraScale, cameraScale, cameraScale);
      }
    }

    if (tentGroupRef.current) {
      tentGroupRef.current.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.transparent = true;
          child.material.opacity = isSection6 ? 0 : opacityRef.current.tent;
          child.material.depthWrite = isSection6 ? false : (opacityRef.current.tent > 0.5);
          child.material.needsUpdate = true;
        }
      });
      
      // ✨ 항상 렌더링 (딜레이 방지)
      tentGroupRef.current.visible = true;
      
      // 삼각형 모드가 아닐 때만 position.z, scale, rotation 조정
      if (currentModel !== 'all') {
        tentGroupRef.current.position.z = 0.1 * opacityRef.current.tent;
        // 개별 스케일 + Y축 회전 적용
        const tentScale = modelTransformRef.current.tent.scale;
        tentGroupRef.current.scale.set(tentScale, tentScale, tentScale);
        tentGroupRef.current.rotation.y = modelTransformRef.current.tent.rotationY;
      }
    }

    if (gamepadGroupRef.current) {
      gamepadGroupRef.current.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.transparent = true;
          child.material.opacity = isSection6 ? 0 : opacityRef.current.gamepad;
          child.material.depthWrite = isSection6 ? false : (opacityRef.current.gamepad > 0.5);
          child.material.needsUpdate = true;
        }
      });
      
      // ✨ 항상 렌더링 (딜레이 방지)
      gamepadGroupRef.current.visible = true;
      
      // 삼각형 모드가 아닐 때만 position.z와 scale 조정
      if (currentModel !== 'all') {
        gamepadGroupRef.current.position.z = 0.1 * opacityRef.current.gamepad;
        // 개별 스케일 적용
        const gamepadScale = modelTransformRef.current.gamepad.scale;
        gamepadGroupRef.current.scale.set(gamepadScale, gamepadScale, gamepadScale);
      }
    }

    // Section 5: 각 오브젝트 개별 Y축 회전 (기존 rotation에 추가)
    if (currentModel === 'all') {
      if (cameraGroupRef.current) {
        // JSX에 설정된 rotation.y(Math.PI * 0.86)를 유지하면서 추가 회전
        cameraGroupRef.current.rotation.y += 0.002;
      }
      if (tentGroupRef.current) {
        // JSX에 설정된 rotation.y(Math.PI * 0.86)를 유지하면서 추가 회전
        tentGroupRef.current.rotation.y += 0.002;
      }
      if (gamepadGroupRef.current) {
        // JSX에 설정된 rotation.y(Math.PI * 3.70)를 유지하면서 추가 회전
        gamepadGroupRef.current.rotation.y += 0.002;
      }
    } else {
      // 섹션 5가 아닐 때는 개별 회전 초기화
      if (cameraGroupRef.current) {
        cameraGroupRef.current.rotation.y = 0;
      }
      if (gamepadGroupRef.current) {
        gamepadGroupRef.current.rotation.y = 0;
      }
    }

  });

  // currentModel이 변경되면 opacity 애니메이션 실행
  React.useEffect(() => {
    if (currentModel === 'all') {
      // Section 5: 모든 모델 표시 (색상 분리 효과)
      // 즉시 모든 모델을 투명하게 설정
      opacityRef.current.camera = 0;
      opacityRef.current.tent = 0;
      opacityRef.current.gamepad = 0;
      
      // 색상 분리 효과: 각 오브젝트가 시간차로 나타남 (0.5초 딜레이)
      // 카메라 - 첫 번째 (0.5초 후)
      gsap.to(opacityRef.current, {
        camera: 1,
        duration: 0.8,
        delay: 0.6,
        ease: 'power2.out',
      });
      
      // 텐트 - 두 번째 (0.7초 후)
      gsap.to(opacityRef.current, {
        tent: 1,
        duration: 0.8,
        delay: 0.8,
        ease: 'power2.out',
      });
      
      // 게임패드 - 세 번째 (0.9초 후)
      gsap.to(opacityRef.current, {
        gamepad: 1,
        duration: 0.8,
        delay: 1,
        ease: 'power2.out',
      });
      
      // modelTransformRef는 삼각형 모드에서는 사용하지 않음 (JSX에서 직접 scale 지정)
      
    } else if (currentModel === 'tent') {
      // 카메라 → 텐트 전환 (특별 효과: 줌아웃 + 회전)
      gsap.to(opacityRef.current, {
        camera: 0,
        tent: 1,
        gamepad: 0,
        duration: 1.0,
        ease: 'power2.inOut',
      });
      
      // 카메라: 작아지면서 사라짐
      gsap.to(modelTransformRef.current.camera, {
        scale: 0.5,
        duration: 1.0,
        ease: 'back.in(1.2)',
      });
      
      // 텐트: 작게 시작해서 커지면서 회전하며 등장
      gsap.fromTo(
        modelTransformRef.current.tent,
        { scale: 0.3, rotationY: -Math.PI },
        {
          scale: 1,
          rotationY: 0,
          duration: 1.0,
          ease: 'back.out(1.5)',
        }
      );
      
    } else if (currentModel === 'gamepad') {
      // 텐트 → 게임패드 전환
      gsap.to(opacityRef.current, {
        camera: 0,
        tent: 0,
        gamepad: 1,
        duration: 0.8,
        ease: 'power2.inOut',
      });
      
      // 텐트: 축소
      gsap.to(modelTransformRef.current.tent, {
        scale: 0.5,
        duration: 0.8,
        ease: 'power2.in',
      });
      
      // 게임패드: 확대
      gsap.fromTo(
        modelTransformRef.current.gamepad,
        { scale: 0.5 },
        {
          scale: 1,
          duration: 0.8,
          ease: 'power2.out',
        }
      );
      
    } else {
      // 카메라로 전환
      gsap.to(opacityRef.current, {
        camera: 1,
        tent: 0,
        gamepad: 0,
        duration: 0.8,
        ease: 'power2.inOut',
      });
      
      // 카메라: 확대
      gsap.to(modelTransformRef.current.camera, {
        scale: 1,
        duration: 0.8,
        ease: 'power2.out',
      });
      
      // 텐트 또는 게임패드: 축소
      gsap.to(modelTransformRef.current.tent, {
        scale: 0.5,
        duration: 0.8,
        ease: 'power2.in',
      });
      gsap.to(modelTransformRef.current.gamepad, {
        scale: 0.5,
        duration: 0.8,
        ease: 'power2.in',
      });
    }
  }, [currentModel]);


  return (
    <>
        {currentModel === 'all' ? (
          // Section 5: 삼각형 대형
          <group ref={triangleGroupRef} position={[0, 0, 0]} rotation={[1.15, Math.PI * 0.13, -0.62]} scale={[0.5, 0.5, 0.5]}>
            {/* 카메라 - Section 5 좌표 */}
            <group 
              ref={cameraGroupRef} 
              position={[-2.10, 1.07, -0.38]} 
              rotation={[0.00, Math.PI * 0.86, 0.00]}
              scale={[9, 9, 9]}
            >
              <primitive object={cameraModel.scene.clone()} />
            </group>
            {/* 텐트 - Section 5 좌표 */}
            <group 
              ref={tentGroupRef} 
              position={[-5.70, -48.43, -14.21]} 
              rotation={[-0.89, Math.PI * 17.66, -0.14]}
              scale={[9, 9, 9]}
            >
              <primitive object={tentModel.scene.clone()} />
            </group>
            {/* 게임패드 - Section 5 좌표 */}
            <group 
              ref={gamepadGroupRef} 
              position={[-3.74, 3.70, 2.25]} 
              rotation={[-0.81, 19.55, 0.33]}
              scale={[0.98, 0.98, 0.98]}
            >
              <primitive object={gamepadModel.scene.clone()} />
            </group>
          </group>
      ) : (
        // 일반 모드: 한 모델씩 표시
        <group ref={groupRef}>
          {/* 카메라 모델 */}
          <group ref={cameraGroupRef}>
            <primitive object={cameraModel.scene.clone()} />
          </group>
          {/* 텐트 모델 */}
          <group ref={tentGroupRef}>
            <primitive object={tentModel.scene.clone()} />
          </group>
          {/* 게임패드 모델 */}
          <group ref={gamepadGroupRef}>
            <primitive object={gamepadModel.scene.clone()} />
          </group>
        </group>
      )}

    </>
  );
};

/**
 * Starlight Particles - 별빛 파티클 효과 (Section 2 전용)
 */
const StarlightParticles = ({ currentSection }) => {
  const particlesRef = useRef();
  const particleCount = 200;
  
  // 파티클 초기 위치 생성
  const positions = React.useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;     // x
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20; // y
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10; // z
    }
    return pos;
  }, []);
  
  // 파티클 애니메이션
  useFrame((state) => {
    if (particlesRef.current && currentSection === 1) { // Section 2
      const time = state.clock.getElapsedTime();
      
      // 반짝이는 효과
      particlesRef.current.material.opacity = 0.3 + Math.sin(time * 2) * 0.2;
      
      // 천천히 회전
      particlesRef.current.rotation.y = time * 0.05;
      particlesRef.current.rotation.x = time * 0.02;
    }
  });
  
  // Section 2일 때만 표시
  if (currentSection !== 1) return null;
  
  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#ffffff"
        transparent
        opacity={0.5}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

/**
 * Falling Leaves - 나뭇잎 떨어지는 효과 (Section 3 전용)
 */
const FallingLeaves = ({ currentSection }) => {
  const leavesRef = useRef();
  const leafCount = 100;
  
  // 나뭇잎 초기 위치 및 속성 생성
  const { positions, speeds, rotations } = React.useMemo(() => {
    const pos = new Float32Array(leafCount * 3);
    const spd = new Float32Array(leafCount);
    const rot = new Float32Array(leafCount);
    
    for (let i = 0; i < leafCount; i++) {
      // 위에서 시작
      pos[i * 3] = (Math.random() - 0.5) * 15;      // x: 넓게 분포
      pos[i * 3 + 1] = Math.random() * 15 + 5;      // y: 위쪽에서 시작
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10;  // z: 깊이감
      
      // 각 나뭇잎의 낙하 속도
      spd[i] = Math.random() * 0.5 + 0.3;
      
      // 회전 속도
      rot[i] = Math.random() * 0.1;
    }
    
    return { positions: pos, speeds: spd, rotations: rot };
  }, []);
  
  // 나뭇잎 애니메이션
  useFrame((state) => {
    if (leavesRef.current && currentSection === 2) { // Section 3
      const time = state.clock.getElapsedTime();
      const posArray = leavesRef.current.geometry.attributes.position.array;
      
      for (let i = 0; i < leafCount; i++) {
        const idx = i * 3;
        
        // 아래로 떨어지기
        posArray[idx + 1] -= speeds[i] * 0.02;
        
        // 좌우로 흔들리기 (바람 효과)
        posArray[idx] += Math.sin(time + i) * 0.005;
        
        // 바닥에 닿으면 다시 위로
        if (posArray[idx + 1] < -5) {
          posArray[idx + 1] = 15;
          posArray[idx] = (Math.random() - 0.5) * 15;
        }
      }
      
      leavesRef.current.geometry.attributes.position.needsUpdate = true;
      
      // 전체적으로 천천히 회전
      leavesRef.current.rotation.y = time * 0.03;
    }
  });
  
  // Section 3일 때만 표시
  if (currentSection !== 2) return null;
  
  return (
    <points ref={leavesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={leafCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        color="#86efac"
        transparent
        opacity={0.7}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};


/**
 * Scene Background Controller - 섹션별 배경색 변경
 */
const SceneBackground = ({ currentSection }) => {
  const { scene } = useThree();
  const targetColorRef = useRef(new THREE.Color()); // ✅ THREE.Color 재사용
  
  // 섹션별 배경색 정의 - useMemo로 캐싱
  const sectionBackgrounds = React.useMemo(() => [
    '#000000',  // Section 1: 검은색 (Hero)
    '#000000',  // Section 2: 검은색 (카메라) - Black
    '#1e4620',  // Section 3: 진한 숲 녹색 (캠핑) - Deep Forest Green
    '#1e3a8a',  // Section 4: 진한 남색 (전자기기/게임) - Deep Navy Blue
    '#000000',  // Section 5: 검은색 (Final CTA)
    '#000000'   // Section 6: 검은색 (시스템 설명)
  ], []);
  
  React.useEffect(() => {
    if (!scene.background) {
      scene.background = new THREE.Color('#000000');
    }
    
    // ✅ 기존 THREE.Color 객체 재사용
    targetColorRef.current.set(sectionBackgrounds[currentSection]);
    
    // GSAP으로 부드럽게 배경색 전환
    gsap.to(scene.background, {
      r: targetColorRef.current.r,
      g: targetColorRef.current.g,
      b: targetColorRef.current.b,
      duration: 0.6,
      ease: 'power2.out'
    });
  }, [currentSection, scene, sectionBackgrounds]);
  
  return null;
};

/**
 * 3D Canvas Container
 */
const Scene3DCanvas = ({ animationState, currentModel, onProgressChange, currentSection, previousSectionRef }) => {
  return (
    <div
      id="model-container"
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 50 }}
    >
      <Canvas
        camera={{ position: [0, 0, 3], fov: 75 }}
        gl={{ alpha: true, antialias: true }}
        dpr={[1, 2]}
      >
        {/* Progress Tracker - Canvas 내부에서 progress 추적 */}
        <ProgressTracker onProgressChange={onProgressChange} />
        
        {/* Scene Background Controller - 섹션별 배경색 변경 */}
        <SceneBackground currentSection={currentSection} />
        
        {/* Starlight Particles - 별빛 파티클 효과 (Section 2) */}
        <StarlightParticles currentSection={currentSection} />
        
        {/* Falling Leaves - 나뭇잎 떨어지는 효과 (Section 3) */}
        <FallingLeaves currentSection={currentSection} />
        
        <ambientLight intensity={2} />
        <directionalLight position={[5, 5, 5]} intensity={1.5} />
        <pointLight position={[-5, 5, -5]} intensity={0.8} />
        <Environment preset="city" />
        
        {/* Suspense로 감싸서 로딩 추적 */}
        <Suspense fallback={null}>
          <Model3D 
            animationState={animationState} 
            currentModel={currentModel} 
            currentSection={currentSection}
            previousSectionRef={previousSectionRef}
          />
        </Suspense>
      </Canvas>
    </div>
  );
};

/**
 * Main HomePage Component
 */
const HomePage = () => {
  const navigate = useNavigate();

  // API로 카테고리별 제품 가져오기
  const { data: cameraData } = useProducts({ category: 'CAMERA', page: 0, size: 3 });
  const { data: campingData } = useProducts({ category: 'CAMPING', page: 0, size: 3 });
  const { data: electronicsData } = useProducts({ category: 'ELECTRONICS', page: 0, size: 3 });

  // API 응답을 섹션에 맞게 변환
  const featuredProducts = useMemo(() => {
    const transformProduct = (product) => {
      const firstImage = product.files?.[0]?.url || 'https://via.placeholder.com/400';
      return {
        id: product.productId || product.product_id,
        name: product.title,
        price: `${(product.rentalFee || product.rental_fee || 0).toLocaleString()}원/일`,
        image: firstImage,
        rating: Number(product.rating) || 0,
        reviews: Number(product.totalReviewCount || product.total_review_count) || 0,
      };
    };

    return {
      camera: cameraData?.content ? cameraData.content.map(transformProduct) : [],
      camping: campingData?.content ? campingData.content.map(transformProduct) : [],
      electronics: electronicsData?.content ? electronicsData.content.map(transformProduct) : [],
    };
  }, [cameraData, campingData, electronicsData]);

  // 현재 모델 상태
  const [currentModel, setCurrentModel] = React.useState('camera');
  
  // 이전 섹션 추적용 ref (Section 6→5 전환 감지용)
  const previousSectionRef = React.useRef(0);
  
  const [currentSectionIndex, setCurrentSectionIndex] = React.useState(0);
  const [isLoaded, setIsLoaded] = React.useState(false); // 로딩 완료 상태
  
  // 로딩 진행률 상태
  const [loadingProgress, setLoadingProgress] = React.useState({
    progress: 0,
    active: true,
    loaded: 0,
    total: 0
  });

  
  // Progress 업데이트 핸들러
  const handleProgressChange = React.useCallback((progressData) => {
    setLoadingProgress(progressData);
    
    // 로딩 완료 시 isLoaded 설정
    if (!progressData.active && progressData.progress >= 100) {
      setIsLoaded(true);
    }
  }, []);


  // GSAP 애니메이션 상태 (Section 1과 동일하게 시작)
  const animationState = useRef({
    rotation: { x: 0, y: Math.PI * 2, z: 0 },
    position: { x: 0, y: 0, z: 0 },
    scale: 6,  // Section 1과 동일
  });

  useEffect(() => {
    const state = animationState.current;
    let isScrolling = false;
    let currentSection = 0;
    const totalSections = 6;  // 6개 섹션

    // 모바일 여부 확인
    const isMobile = window.innerWidth <= 768;

    // 각 섹션의 애니메이션 상태
    const sectionStates = [
      // Section 1: Hero (Section 2와 비슷한 크기로 시작)
      {
        position: { x: 0.02, y: 0.24, z: 0 },
        rotation: { x: 0, y: Math.PI * 2, z: 0 },
        scale: 6,  // 3 → 6으로 증가 (Section 2와 차이 줄임)
      },
      // Section 2: 카메라 (모바일/PC 반응형)
      isMobile ? {
        position: { x: 0.65, y: 0.65, z: 0 },
        rotation: { x: 0.3, y: Math.PI * 2.2, z: 0.2 },
        scale: 3,
      } : {
        position: { x: -1.5, y: -0.5, z: 0 },
        rotation: { x: 0.3, y: Math.PI * 2.5, z: 0.2 },
        scale: 9,
      },
      // Section 3: 캠핑 (모바일/PC 반응형)
      isMobile ? {
        position: { x: 0.5, y: 0.7, z: 0.00 },
        rotation: { x: -0.32, y: Math.PI * 0.5, z: 0.6 },
        scale: 0.3,
      } : {
        position: { x: -1.96, y: -1.00, z: 0.00 },
        rotation: { x: -0.32, y: Math.PI * 0.46, z: 0.13 },
        scale: 0.98,
      },
      // Section 4: 전자기기 (게임패드) (모바일/PC 반응형)
      isMobile ? {
        position: { x: 0.9, y: 1.3, z: 0.00 },
        rotation: { x: 1.7, y: Math.PI * -0.17, z: 0.72 },
        scale: 5.00,
      } : {
        position: { x: -2.39, y: 0.94, z: 0.00 },
        rotation: { x: 1.15, y: Math.PI * 0.13, z: -0.62 },
        scale: 15.00,
      },
      // Section 5: Final CTA (삼각형 대형 - 중앙 고정)
      {
        position: { x: 0, y: 0, z: 0 },  // 중앙 고정
        rotation: { x: 0, y: 0, z: 0 },  // 회전 없음
        scale: 1,  // JSX에서 이미 0.5 적용됨
      },
      // Section 6: 시스템 설명 (삼각형 대형 - 위치 동일, opacity로만 숨김)
      {
        position: { x: 0, y: 0, z: 0 },  // Section 5와 동일 (위치 변경 없음)
        rotation: { x: 0, y: 0, z: 0 },  // 회전 없음
        scale: 1,  // Section 5와 동일
      }
    ];


    // 섹션으로 즉시 이동하는 함수
    const goToSection = (index) => {
      if (index < 0 || index >= totalSections || isScrolling) return;
      isScrolling = true;
      const previousSection = currentSection;
      previousSectionRef.current = currentSection; // ref에 이전 섹션 저장
      currentSection = index;
      setCurrentSectionIndex(index);  // 디버그용 섹션 인덱스 업데이트

      // 섹션별 모델 전환
      if (index === 2) {
        setCurrentModel('tent');      // Section 3: 텐트
      } else if (index === 3) {
        setCurrentModel('gamepad');   // Section 4: 게임패드
      } else if (index === 4) {
        // Section 5: 모든 모델 (삼각형 대형)
        if (previousSection === 5) {
          // Section 6→5 전환: currentModel을 명확히 변경하여 useEffect 트리거
          setCurrentModel('camera');    // 임시로 다른 값 설정
          setTimeout(() => setCurrentModel('all'), 10); // 즉시 'all'로 변경하여 opacity 효과 트리거
        } else {
          setCurrentModel('all');
        }
      } else if (index === 5) {
        setCurrentModel('all');       // Section 6: 모든 모델 (삼각형 대형, opacity 0)
      } else {
        setCurrentModel('camera');    // Section 1, 2: 카메라
      }

      const targetState = sectionStates[index];

      // GSAP으로 부드럽게 애니메이션
      // Section 1→2 전환은 더 부드럽게
      const animDuration = (currentSection === 0 && index === 1) ? 0.6 : 0.8;
      const animEase = 'power2.inOut';

      gsap.to(state.position, {
        x: targetState.position.x,
        y: targetState.position.y,
        z: targetState.position.z,
        duration: animDuration,
        ease: animEase,
      });

      gsap.to(state.rotation, {
        x: targetState.rotation.x,
        y: targetState.rotation.y,
        z: targetState.rotation.z,
        duration: animDuration,
        ease: animEase,
      });

      gsap.to(state, {
        scale: targetState.scale,
        duration: animDuration,
        ease: animEase,
        onComplete: () => {
          isScrolling = false;
        },
      });

      // 스크롤 위치 이동
      const targetElement = document.getElementById(`section-${index + 1}`);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth' });
      }
    };

    // 휠 이벤트 핸들러 (한 섹션씩만 이동)
    const handleWheel = (e) => {
      if (isScrolling) {
        e.preventDefault();
        return;
      }

      const delta = e.deltaY;
      
      if (delta > 0) {
        // 아래로 스크롤
        if (currentSection < totalSections - 1) {
          e.preventDefault();
          goToSection(currentSection + 1);
        }
      } else {
        // 위로 스크롤
        if (currentSection > 0) {
          e.preventDefault();
          goToSection(currentSection - 1);
        }
      }
    };

    // 터치 이벤트 핸들러 (모바일)
    let touchStartY = 0;
    let touchStartTime = 0;
    let isTouchScrolling = false;
    
    const handleTouchStart = (e) => {
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
      isTouchScrolling = false;
    };

    const handleTouchMove = (e) => {
      // 스크롤 중이 아니고 섹션 기반 스크롤 영역이면 기본 스크롤 방지
      if (!isNormalScrolling && currentSection < totalSections) {
        const touchCurrentY = e.touches[0].clientY;
        const delta = Math.abs(touchStartY - touchCurrentY);
        
        // 일정 거리 이상 움직이면 터치 스크롤로 간주
        if (delta > 30) {
          isTouchScrolling = true;
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = (e) => {
      const touchEndY = e.changedTouches[0].clientY;
      const delta = touchStartY - touchEndY;
      const touchDuration = Date.now() - touchStartTime;

      // 빠른 스와이프 또는 충분한 거리 이동 시에만 섹션 전환
      const isQuickSwipe = touchDuration < 300 && Math.abs(delta) > 30;
      const isLongSwipe = Math.abs(delta) > 80;

      if (isTouchScrolling && (isQuickSwipe || isLongSwipe)) {
        if (delta > 0) {
          // 위로 스와이프 (다음 섹션)
          if (currentSection < totalSections - 1) {
            e.preventDefault();
            goToSection(currentSection + 1);
          }
        } else {
          // 아래로 스와이프 (이전 섹션)
          if (currentSection > 0) {
            e.preventDefault();
            goToSection(currentSection - 1);
          }
        }
      }
      
      isTouchScrolling = false;
    };

    // 키보드 이벤트 핸들러
    const handleKeyDown = (e) => {
      // 스페이스바로 인한 스크롤 방지
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        return;
      }

      if (isScrolling) return;

      // Section 5에서 아래로 키보드 스크롤 시 일반 스크롤로 전환
      const isAtEnd = currentSection === totalSections - 1;
      const scrollingDownKey = e.key === 'ArrowDown' || e.key === 'PageDown';

      if (isAtEnd && scrollingDownKey) {
        isNormalScrolling = true;
        handleNormalScroll();
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
        case 'PageDown':
          if (currentSection < totalSections - 1) {
            e.preventDefault();
            goToSection(currentSection + 1);
          }
          break;
        case 'ArrowUp':
        case 'PageUp':
          if (currentSection > 0) {
            e.preventDefault();
            isNormalScrolling = false;
            goToSection(currentSection - 1);
          }
          break;
        case 'Home':
          e.preventDefault();
          goToSection(0);
          break;
        case 'End':
          e.preventDefault();
          goToSection(totalSections - 1);
          break;
        default:
          break;
      }
    };

    // 이벤트 리스너 등록
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: false });
    window.addEventListener('keydown', handleKeyDown);

    // 초기 상태 설정
    goToSection(0);

    // 클린업
    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('keydown', handleKeyDown);
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  // 화면 크기 변경 감지 (모바일/PC 전환 시 재렌더링)
  useEffect(() => {
    let resizeTimeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        // 현재 섹션으로 다시 이동하여 좌표 재적용
        const currentSection = currentSectionIndex;
        setCurrentSectionIndex(-1); // 강제 리렌더링
        setTimeout(() => setCurrentSectionIndex(currentSection), 50);
      }, 300); // 300ms 디바운스
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, [currentSectionIndex]);

  return (


    <div 
      className="bg-black text-white" 
      style={{ 
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
        touchAction: 'pan-y',
        overscrollBehavior: 'none'
      }}
    >

      {/* 로딩 화면 */}
      <LoadingScreen 
        progress={loadingProgress.progress}
        active={loadingProgress.active}
        loaded={loadingProgress.loaded}
        total={loadingProgress.total}
        onLoadComplete={() => setIsLoaded(true)}
      />

      {/* 3D Model Canvas */}
      <Scene3DCanvas 
        animationState={animationState} 
        currentModel={currentModel} 
        onProgressChange={handleProgressChange}
        currentSection={currentSectionIndex}
        previousSectionRef={previousSectionRef}
      />

      {/* Lottie 스크롤 인디케이터 (왼쪽 고정) */}
      <ScrollIndicator currentSection={currentSectionIndex} totalSections={6} />

      {/* 로딩 완료 후에만 섹션 표시 */}
      {isLoaded && (
        <>
          {/* Section 1: Hero */}
          <Section1Hero />

      {/* Section 2: 카메라 */}
      <Section2Camera products={featuredProducts.camera} />

      {/* Section 3: 캠핑용품 */}
      <Section3Tent products={featuredProducts.camping} />

      {/* Section 4: 전자기기 */}
      <Section4Gamepad products={featuredProducts.electronics} />

      {/* Section 5: Final CTA */}
      <Section5Triangle />

      {/* Section 6: 시스템 설명 */}
      <Section6System />
        </>
      )}
    </div>
  );
};

export default HomePage;


