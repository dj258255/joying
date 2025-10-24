/**
 * HomePage Component


 * 섹션별 카메라 각도 전환 + Sticky 스크롤
 */



import React, { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Environment, TransformControls, useProgress, Loader } from '@react-three/drei';
import { useNavigate } from 'react-router-dom';

import * as THREE from 'three';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ROUTE_PATHS } from '@/shared/constants';


import LoadingScreen from '../components/LoadingScreen';
import ScrollIndicator from '../components/ScrollIndicator';

gsap.registerPlugin(ScrollTrigger);

// 모델 프리로드
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
const Model3D = ({ animationState, currentModel, debugMode, onTransformChange, controlMode, selectedTriangleModel, currentSection }) => {
  // useGLTF로 모델 로드 (suspense 모드로 로딩 추적)
  const cameraModel = useGLTF('/models/camera.glb', true); // suspense: true
  const tentModel = useGLTF('/models/tent.glb', true);
  const gamepadModel = useGLTF('/models/gamepad.glb', true);
  const groupRef = useRef();
  const cameraGroupRef = useRef();
  const tentGroupRef = useRef();
  const gamepadGroupRef = useRef();
  const transformControlsRef = useRef();
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
    
    // 디버그 모드일 때는 TransformControls가 제어하므로 애니메이션 업데이트 건너뛰기
    if (debugMode) {
      if (currentModel === 'all') {
        // 삼각형 모드: 선택된 모델의 값을 animationState에 반영
        let targetRef = null;
        if (selectedTriangleModel === 'group' && triangleGroupRef.current) {
          targetRef = triangleGroupRef.current;
        } else if (selectedTriangleModel === 'camera' && cameraGroupRef.current) {
          targetRef = cameraGroupRef.current;
        } else if (selectedTriangleModel === 'tent' && tentGroupRef.current) {
          targetRef = tentGroupRef.current;
        } else if (selectedTriangleModel === 'gamepad' && gamepadGroupRef.current) {
          targetRef = gamepadGroupRef.current;
        }
        
        if (targetRef) {
          animationState.current.position.x = targetRef.position.x;
          animationState.current.position.y = targetRef.position.y;
          animationState.current.position.z = targetRef.position.z;
          animationState.current.rotation.x = targetRef.rotation.x;
          animationState.current.rotation.y = targetRef.rotation.y;
          animationState.current.rotation.z = targetRef.rotation.z;
          animationState.current.scale = targetRef.scale.x;
          
          // 부모 컴포넌트에 변경 알림
          if (onTransformChange) {
            onTransformChange();
          }
        }
        return;
      } else if (groupRef.current) {
        // 일반 모드: groupRef의 값을 animationState에 반영
        animationState.current.position.x = groupRef.current.position.x;
        animationState.current.position.y = groupRef.current.position.y;
        animationState.current.position.z = groupRef.current.position.z;
        animationState.current.rotation.x = groupRef.current.rotation.x;
        animationState.current.rotation.y = groupRef.current.rotation.y;
        animationState.current.rotation.z = groupRef.current.rotation.z;
        animationState.current.scale = groupRef.current.scale.x;
        
        // 부모 컴포넌트에 변경 알림
        if (onTransformChange) {
          onTransformChange();
        }
        return;
      }
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

    // Section 5: 각 오브젝트 개별 Y축 회전
    if (currentModel === 'all') {
      if (cameraGroupRef.current) {
        modelRotationsRef.current.camera += 0.002;
        cameraGroupRef.current.rotation.y = modelRotationsRef.current.camera;
      }
      if (tentGroupRef.current) {
        modelRotationsRef.current.tent += 0.002;
        tentGroupRef.current.rotation.y = modelRotationsRef.current.tent;
      }
      if (gamepadGroupRef.current) {
        modelRotationsRef.current.gamepad += 0.002;
        gamepadGroupRef.current.rotation.y = modelRotationsRef.current.gamepad;
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
      
      // Section 5 진입 시 회전값 초기화
      modelRotationsRef.current.camera = 0;
      modelRotationsRef.current.tent = 0;
      modelRotationsRef.current.gamepad = 0;
      
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
        // Section 5: 삼각형 대형으로 회전 (전체 크기 축소)
        <group ref={triangleGroupRef} scale={[0.5, 0.5, 0.5]} position={[0, 0, 0]}>
          {/* 카메라 - Section 2 scale: 9 유지 */}
          <group 
            ref={cameraGroupRef} 
            position={[-2.10, 1.07, -0.38]} 
            rotation={[0.00, Math.PI * 12.41, 0.00]}
            scale={[9, 9, 9]}
          >
            <primitive object={cameraModel.scene.clone()} />
          </group>
          {/* 텐트 - Section 3 scale: 0.98 유지 */}
          <group 
            ref={tentGroupRef} 
            position={[-4.09, -1.54, 0.62]} 
            rotation={[-0.77, Math.PI * 12.41, 0.03]}
            scale={[0.98, 0.98, 0.98]}
          >
            <primitive object={tentModel.scene.clone()} />
          </group>
          {/* 게임패드 - Section 4 scale: 15 유지 */}
          <group 
            ref={gamepadGroupRef} 
            position={[-1.57, 1.37, 2.37]} 
            rotation={[2.21, Math.PI * 18.92, 2.49]}
            scale={[15, 15, 15]}
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
      
      {/* 디버그 모드일 때만 TransformControls 표시 */}
      {debugMode && (
        <>
          {/* 일반 모드: 단일 모델 조작 */}
          {currentModel !== 'all' && groupRef.current && (
            <TransformControls
              ref={transformControlsRef}
              object={groupRef.current}
              mode={controlMode}
              showX={true}
              showY={true}
              showZ={true}
              size={1}
              onObjectChange={onTransformChange}
            />
          )}
          {/* 삼각형 모드: 선택된 모델 조작 */}
          {currentModel === 'all' && (
            <>
              {selectedTriangleModel === 'group' && triangleGroupRef.current && (
                <TransformControls
                  ref={transformControlsRef}
                  object={triangleGroupRef.current}
                  mode={controlMode}
                  showX={true}
                  showY={true}
                  showZ={true}
                  size={1}
                  onObjectChange={onTransformChange}
                />
              )}
              {selectedTriangleModel === 'camera' && cameraGroupRef.current && (
                <TransformControls
                  ref={transformControlsRef}
                  object={cameraGroupRef.current}
                  mode={controlMode}
                  showX={true}
                  showY={true}
                  showZ={true}
                  size={1}
                  onObjectChange={onTransformChange}
                />
              )}
              {selectedTriangleModel === 'tent' && tentGroupRef.current && (
                <TransformControls
                  ref={transformControlsRef}
                  object={tentGroupRef.current}
                  mode={controlMode}
                  showX={true}
                  showY={true}
                  showZ={true}
                  size={1}
                  onObjectChange={onTransformChange}
                />
              )}
              {selectedTriangleModel === 'gamepad' && gamepadGroupRef.current && (
                <TransformControls
                  ref={transformControlsRef}
                  object={gamepadGroupRef.current}
                  mode={controlMode}
                  showX={true}
                  showY={true}
                  showZ={true}
                  size={1}
                  onObjectChange={onTransformChange}
                />
              )}
            </>
          )}
        </>
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
const Scene3DCanvas = ({ animationState, currentModel, debugMode, onTransformChange, controlMode, selectedTriangleModel, onProgressChange, currentSection }) => {
  return (
    <div
      id="model-container"
      className={debugMode ? "fixed inset-0" : "fixed inset-0 pointer-events-none"}
      style={{ zIndex: debugMode ? 9998 : 50 }}
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
            debugMode={debugMode}
            onTransformChange={onTransformChange}
            controlMode={controlMode}
            selectedTriangleModel={selectedTriangleModel}
            currentSection={currentSection}
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



  // 현재 모델 상태
  const [currentModel, setCurrentModel] = React.useState('camera');
  
  // 디버그 모드 상태
  const [debugMode, setDebugMode] = React.useState(false);
  const [currentSectionIndex, setCurrentSectionIndex] = React.useState(0);
  const [controlMode, setControlMode] = React.useState('translate'); // translate, rotate, scale
  const [forceUpdate, setForceUpdate] = React.useState(0);
  const [selectedTriangleModel, setSelectedTriangleModel] = React.useState('group'); // 'group', 'camera', 'tent', 'gamepad'
  const [isLoaded, setIsLoaded] = React.useState(false); // 로딩 완료 상태
  
  // 로딩 진행률 상태
  const [loadingProgress, setLoadingProgress] = React.useState({
    progress: 0,
    active: true,
    loaded: 0,
    total: 0
  });
  
  // TransformControls에서 변경될 때마다 UI 업데이트
  const handleTransformChange = React.useCallback(() => {
    setForceUpdate(prev => prev + 1);
  }, []);
  
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

    // 각 섹션의 애니메이션 상태
    const sectionStates = [
      // Section 1: Hero (Section 2와 비슷한 크기로 시작)
      {
        position: { x: 0, y: 0.05, z: 0 },
        rotation: { x: 0, y: Math.PI * 2, z: 0 },
        scale: 6,  // 3 → 6으로 증가 (Section 2와 차이 줄임)
      },
      // Section 2: 카메라
      {
        position: { x: -1.5, y: -0.5, z: 0 },
        rotation: { x: 0.3, y: Math.PI * 2.5, z: 0.2 },
        scale: 9,
      },
      // Section 3: 캠핑
      {
        position: { 
          x: -1.96, 
          y: -1.00, 
          z: 0.00 
        },
        rotation: { 
          x: -0.32, 
          y: Math.PI * 0.46, 
          z: 0.13 
        },
        scale: 0.98,
      },
      // Section 4: 전자기기 (게임패드를 90도로 세움)
      {
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
      currentSection = index;
      setCurrentSectionIndex(index);  // 디버그용 섹션 인덱스 업데이트

      // 섹션별 모델 전환
      if (index === 2) {
        setCurrentModel('tent');      // Section 3: 텐트
      } else if (index === 3) {
        setCurrentModel('gamepad');   // Section 4: 게임패드
      } else if (index === 4) {
        // Section 5: 모든 모델 (삼각형 대형)
        // Section 6→5 전환 시 opacity 효과를 위해 모델을 다시 설정
        if (previousSection === 5) {
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
    const handleTouchStart = (e) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e) => {
      if (isScrolling) return;

      const touchEndY = e.changedTouches[0].clientY;
      const delta = touchStartY - touchEndY;

      if (Math.abs(delta) > 50) {
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
    };

    // 키보드 이벤트 핸들러
    const handleKeyDown = (e) => {
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
    window.addEventListener('touchend', handleTouchEnd, { passive: false });
    window.addEventListener('keydown', handleKeyDown);

    // 초기 상태 설정
    goToSection(0);

    // 클린업
    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('keydown', handleKeyDown);
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  return (


    <div className="bg-black text-white" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>
      {/* 디버그 토글 버튼 - 로딩 완료 후에만 표시 */}
      {isLoaded && (
        <button
          onClick={() => setDebugMode(!debugMode)}
          className="fixed top-4 right-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-semibold shadow-lg z-[9999]"
        >
          {debugMode ? '🔧 디버그 OFF' : '🔧 디버그 ON'}
        </button>
      )}

      {/* 디버그 패널 */}
      {debugMode && (
        <div className="fixed top-16 right-4 bottom-4 bg-gray-900/95 text-white p-6 rounded-lg shadow-2xl border border-gray-700 z-[9999] max-w-md overflow-y-auto">
          <h3 className="text-xl font-bold mb-4 text-purple-400">🎯 3D 오브젝트 디버거</h3>
          
          {/* 삼각형 모드: 모델 선택 */}
          {currentModel === 'all' && (
            <div className="mb-4 p-4 bg-gradient-to-r from-purple-900/50 to-pink-900/50 rounded border border-purple-500">
              <h4 className="font-semibold mb-3 text-pink-400">🎯 조작할 모델 선택</h4>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSelectedTriangleModel('group')}
                  className={`px-3 py-2 rounded text-sm font-semibold transition-all ${
                    selectedTriangleModel === 'group' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  🔺 전체 그룹
                </button>
                <button
                  onClick={() => setSelectedTriangleModel('camera')}
                  className={`px-3 py-2 rounded text-sm font-semibold transition-all ${
                    selectedTriangleModel === 'camera' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  📷 카메라
                </button>
                <button
                  onClick={() => setSelectedTriangleModel('tent')}
                  className={`px-3 py-2 rounded text-sm font-semibold transition-all ${
                    selectedTriangleModel === 'tent' 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  ⛺ 텐트
                </button>
                <button
                  onClick={() => setSelectedTriangleModel('gamepad')}
                  className={`px-3 py-2 rounded text-sm font-semibold transition-all ${
                    selectedTriangleModel === 'gamepad' 
                      ? 'bg-red-600 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  🎮 게임패드
              </button>
            </div>
          </div>
          )}

          {/* 컨트롤 모드 전환 */}
          <div className="mb-4 p-4 bg-gray-800 rounded">
            <h4 className="font-semibold mb-3 text-yellow-400">🎮 컨트롤 모드</h4>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setControlMode('translate')}
                className={`px-3 py-2 rounded text-sm font-semibold transition-all ${
                  controlMode === 'translate' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                📍 이동
              </button>
              <button
                onClick={() => setControlMode('rotate')}
                className={`px-3 py-2 rounded text-sm font-semibold transition-all ${
                  controlMode === 'rotate' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                🔄 회전
              </button>
              <button
                onClick={() => setControlMode('scale')}
                className={`px-3 py-2 rounded text-sm font-semibold transition-all ${
                  controlMode === 'scale' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                📏 크기
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              💡 3D 오브젝트를 마우스로 드래그하세요!
            </p>
          </div>
          
          {/* 현재 상태 표시 */}
          <div className="mb-4 p-4 bg-gray-800 rounded">
            <p className="text-sm text-gray-400 mb-2">현재 섹션: <span className="text-green-400 font-bold">Section {currentSectionIndex + 1}</span></p>
            <p className="text-sm text-gray-400">현재 모델: <span className="text-blue-400 font-bold">{currentModel}</span></p>
            {currentModel === 'all' && (
              <p className="text-xs text-orange-400 mt-2">
                🎯 조작 중: <span className="font-bold">
                  {selectedTriangleModel === 'group' && '전체 그룹'}
                  {selectedTriangleModel === 'camera' && '카메라'}
                  {selectedTriangleModel === 'tent' && '텐트'}
                  {selectedTriangleModel === 'gamepad' && '게임패드'}
                </span>
              </p>
            )}
          </div>

          {/* 실시간 좌표 표시 */}
          <div className="mb-4 p-4 bg-gray-800 rounded">
            <h4 className="font-semibold mb-2 text-yellow-400">
              📍 실시간 좌표 {currentModel === 'all' && '(삼각형 그룹)'}
            </h4>
            <div className="text-xs font-mono space-y-1">
              <p>Position:</p>
              <p className="pl-4">x: <span className="text-green-400">{animationState.current.position.x.toFixed(2)}</span></p>
              <p className="pl-4">y: <span className="text-green-400">{animationState.current.position.y.toFixed(2)}</span></p>
              <p className="pl-4">z: <span className="text-green-400">{animationState.current.position.z.toFixed(2)}</span></p>
              
              <p className="mt-2">Rotation:</p>
              <p className="pl-4">x: <span className="text-blue-400">{animationState.current.rotation.x.toFixed(2)}</span> ({(animationState.current.rotation.x * 180 / Math.PI).toFixed(0)}°)</p>
              <p className="pl-4">y: <span className="text-blue-400">{animationState.current.rotation.y.toFixed(2)}</span> ({(animationState.current.rotation.y * 180 / Math.PI).toFixed(0)}°)</p>
              <p className="pl-4">z: <span className="text-blue-400">{animationState.current.rotation.z.toFixed(2)}</span> ({(animationState.current.rotation.z * 180 / Math.PI).toFixed(0)}°)</p>
              
              <p className="mt-2">Scale: <span className="text-purple-400">{animationState.current.scale.toFixed(2)}</span></p>
            </div>
          </div>

          {/* 복사 가능한 코드 */}
          <div className="mb-4 p-4 bg-gray-800 rounded">
            <h4 className="font-semibold mb-2 text-pink-400">📋 복사용 코드</h4>
            <pre className="text-xs font-mono bg-black p-2 rounded overflow-x-auto">
{`{
  position: { 
    x: ${animationState.current.position.x.toFixed(2)}, 
    y: ${animationState.current.position.y.toFixed(2)}, 
    z: ${animationState.current.position.z.toFixed(2)} 
  },
  rotation: { 
    x: ${animationState.current.rotation.x.toFixed(2)}, 
    y: Math.PI * ${(animationState.current.rotation.y / Math.PI).toFixed(2)}, 
    z: ${animationState.current.rotation.z.toFixed(2)} 
  },
  scale: ${animationState.current.scale.toFixed(2)},
}`}
            </pre>
            <button
              onClick={() => {
                const code = `{\n  position: { x: ${animationState.current.position.x.toFixed(2)}, y: ${animationState.current.position.y.toFixed(2)}, z: ${animationState.current.position.z.toFixed(2)} },\n  rotation: { x: ${animationState.current.rotation.x.toFixed(2)}, y: Math.PI * ${(animationState.current.rotation.y / Math.PI).toFixed(2)}, z: ${animationState.current.rotation.z.toFixed(2)} },\n  scale: ${animationState.current.scale.toFixed(2)},\n}`;
                navigator.clipboard.writeText(code);
                alert('코드가 클립보드에 복사되었습니다!');
              }}
              className="mt-2 w-full bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-xs"
            >
              📋 복사하기
            </button>
          </div>

          {/* 사용 방법 */}
          <div className="p-4 bg-blue-900/30 rounded border border-blue-700">
            <h4 className="font-semibold mb-2 text-blue-400">💡 사용 방법</h4>
            <ol className="text-xs space-y-1 text-gray-300">
              <li>1. 원하는 섹션으로 스크롤</li>
              <li>2. 실시간 좌표 확인</li>
              <li>3. "복사하기" 클릭</li>
              <li>4. HomePage.jsx의 sectionStates에 붙여넣기</li>
            </ol>
          </div>
        </div>
      )}

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
        debugMode={debugMode}
        onTransformChange={handleTransformChange}
        controlMode={controlMode}
        selectedTriangleModel={selectedTriangleModel}
        onProgressChange={handleProgressChange}
        currentSection={currentSectionIndex}
      />

      {/* Lottie 스크롤 인디케이터 (왼쪽 고정) */}
      <ScrollIndicator currentSection={currentSectionIndex} totalSections={6} />

      {/* 로딩 완료 후에만 섹션 표시 */}
      {isLoaded && (
        <>
          {/* Section 1: Hero */}
          <section
            id="section-1"
            className={`relative min-h-screen flex items-center justify-center ${debugMode ? 'pointer-events-none opacity-30' : ''}`}
            style={{ zIndex: 60 }}
          >
        <div className="container mx-auto px-8 text-center">
          <h1 className="text-8xl font-bold mb-6 tracking-tight">
            빌려<span className="text-primary-500">joying</span>
          </h1>
          <p className="text-2xl text-gray-300 mb-12 font-light">
            필요한 물건을 빌려주고 빌리는 지역 기반 렌탈 플랫폼
          </p>
              <button
            onClick={() => navigate(ROUTE_PATHS.PRODUCTS)}
            className="bg-primary-500 text-white px-12 py-4 rounded-full text-lg font-semibold hover:bg-primary-600 transition-all hover:scale-105"
              >
            시작하기
              </button>
        </div>
      </section>



      {/* Section 2: 카메라 */}
      <section
        id="section-2"
        className={`relative min-h-screen flex items-center ${debugMode ? 'pointer-events-none opacity-30' : ''}`}
        style={{ zIndex: 60 }}
      >
        <div className="container mx-auto px-8">
          <div className="max-w-2xl ml-auto">
            <span className="text-primary-500 text-sm font-semibold uppercase tracking-wider mb-4 block">
              카메라 렌탈
            </span>
            <h2 className="text-6xl font-bold mb-6">
              전문가용<br />카메라
          </h2>
          

            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
              DSLR부터 미러리스까지, 전문가용 카메라를 합리적인 가격에 대여할 수 있습니다.
              완벽한 순간을 담아보세요.
            </p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(`${ROUTE_PATHS.SEARCH}?category=camera`)}
                className="bg-white text-black px-8 py-3 rounded-full font-semibold hover:bg-gray-200 transition-all hover:scale-105"
              >
                카메라 둘러보기
              </button>
            </div>
          </div>


        </div>
      </section>

      {/* Section 3: 캠핑용품 */}
      <section
        id="section-3"
        className={`relative min-h-screen flex items-center ${debugMode ? 'pointer-events-none opacity-30' : ''}`}
        style={{ zIndex: 60 }}
      >
        <div className="container mx-auto px-8">
          <div className="max-w-2xl ml-auto">
            <span className="text-green-400 text-sm font-semibold uppercase tracking-wider mb-4 block">
              아웃도어
            </span>
            <h2 className="text-6xl font-bold mb-6">
              자연을<br />만끽하다
            </h2>
            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
              텐트, 캠핑 의자, 테이블 등 다양한 캠핑용품을 대여하여
              편안하고 즐거운 아웃도어 경험을 만드세요.
            </p>
            <div className="flex items-center gap-4">
              <button


                onClick={() => navigate(`${ROUTE_PATHS.SEARCH}?category=camping`)}
                className="bg-white text-black px-8 py-3 rounded-full font-semibold hover:bg-gray-200 transition-all hover:scale-105"
              >

                캠핑용품 둘러보기
              </button>


            </div>
          </div>
        </div>
      </section>



      {/* Section 4: 전자기기 */}
      <section
        id="section-4"
        className={`relative min-h-screen flex items-center ${debugMode ? 'pointer-events-none opacity-30' : ''}`}
        style={{ zIndex: 60 }}
      >
        <div className="container mx-auto px-8">
          <div className="max-w-2xl ml-auto">
            <span className="text-blue-400 text-sm font-semibold uppercase tracking-wider mb-4 block">
              테크
            </span>
            <h2 className="text-6xl font-bold mb-6">
              최신<br />전자기기
          </h2>
          

            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
              노트북, 태블릿, 빔 프로젝터 등 최신 전자기기를 대여하여
              스마트한 생활과 업무를 경험하세요.
            </p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(`${ROUTE_PATHS.SEARCH}?category=electronics`)}
                className="bg-white text-black px-8 py-3 rounded-full font-semibold hover:bg-gray-200 transition-all hover:scale-105"
              >
                전자기기 둘러보기
              </button>
                </div>
                </div>
              </div>


      </section>



      {/* Section 5: Final CTA */}
      <section
        id="section-5"
        className={`relative min-h-screen flex items-center justify-end ${debugMode ? 'pointer-events-none opacity-30' : ''}`}
        style={{ zIndex: 60 }}
      >
        <div className="container mx-auto px-8">
          <div className="max-w-2xl ml-auto text-right">
            <h2 className="text-7xl font-bold mb-6">
              지금 바로<br />
              <span className="text-primary-500">시작하세요</span>
          </h2>


            <p className="text-xl text-gray-300 mb-12 leading-relaxed">
              안전한 11단계 거래 시스템과 보증금 에스크로로<br />
              믿을 수 있는 렌탈 서비스를 경험하세요
            </p>
            <div className="flex items-center justify-end gap-4">
              <button
                onClick={() => navigate(ROUTE_PATHS.LOGIN)}
                className="bg-primary-500 text-white px-12 py-4 rounded-full text-lg font-semibold hover:bg-primary-600 transition-all hover:scale-105"
              >
                회원가입하기
              </button>
              <button
                onClick={() => navigate(ROUTE_PATHS.PRODUCTS)}
                className="border-2 border-white text-white px-12 py-4 rounded-full text-lg font-semibold hover:bg-white hover:text-black transition-all hover:scale-105"
              >
                둘러보기
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Section 6: 시스템 설명 */}
      <section
        id="section-6"
        className={`relative h-screen flex items-center overflow-hidden ${debugMode ? 'pointer-events-none opacity-30' : ''}`}
        style={{ zIndex: 60 }}
      >
        <div className="container mx-auto px-8">
          <h2 className="text-4xl font-bold text-center mb-12">
            안전한 거래를 위한 <span className="text-primary-500">3가지 시스템</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="text-center">
              <div className="w-14 h-14 bg-primary-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🛡️</span>
              </div>
              <h3 className="text-xl font-bold mb-3">보증금 에스크로</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                플랫폼이 보증금을 안전하게 보관하여<br />분쟁 시 공정한 중재를 제공합니다
              </p>
            </div>

            <div className="text-center">
              <div className="w-14 h-14 bg-primary-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📹</span>
              </div>
              <h3 className="text-xl font-bold mb-3">개봉 영상 필수</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                수령 시와 반납 시 개봉 영상을 촬영하여<br />물건 상태를 명확히 기록합니다
              </p>
            </div>

            <div className="text-center">
              <div className="w-14 h-14 bg-primary-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⭐</span>
              </div>
              <h3 className="text-xl font-bold mb-3">신뢰도 시스템</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                거래 횟수와 평점을 기반으로 한 뱃지 시스템으로<br />신뢰할 수 있는 거래를 보장합니다
              </p>
            </div>
          </div>

          {/* 거래 단계 */}
          <div className="max-w-4xl mx-auto border-t border-gray-800 pt-12">
            <h3 className="text-3xl font-bold text-center mb-8">
              간편한 <span className="text-primary-500">3단계</span> 대여
            </h3>
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1 text-center">
                <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-3 text-lg font-bold">
                  1
                </div>
                <h4 className="text-lg font-semibold mb-2">상품 검색 및 선택</h4>
                <p className="text-gray-400 text-sm">
                  원하는 물건을 검색하고<br />대여 기간을 설정하세요
                </p>
              </div>
              <div className="flex-1 text-center">
                <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-3 text-lg font-bold">
                  2
                </div>
                <h4 className="text-lg font-semibold mb-2">안전하게 거래</h4>
                <p className="text-gray-400 text-sm">
                  보증금 에스크로와 개봉 영상으로<br />안심하고 거래하세요
                </p>
              </div>
              <div className="flex-1 text-center">
                <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-3 text-lg font-bold">
                  3
                </div>
                <h4 className="text-lg font-semibold mb-2">즐겁게 사용 후 반납</h4>
                <p className="text-gray-400 text-sm">
                  안전하게 받아서 사용하세요
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
        </>
      )}
    </div>
  );
};

export default HomePage;


