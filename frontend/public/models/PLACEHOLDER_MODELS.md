# 임시 테스트용 3D 모델 안내

GLB 파일이 준비되지 않았다면, 아래 방법으로 임시 모델을 사용할 수 있습니다.

## 방법 1: 기본 Geometry 사용 (가장 빠름)

`FloatingObjects.jsx`를 수정하여 Three.js 기본 geometry로 테스트:

```jsx
// GLB 대신 기본 geometry 사용
const FloatingObject = ({ position, category, onClick, color }) => {
  return (
    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.5}>
      <mesh position={position} onClick={() => onClick(category)}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </Float>
  );
};
```

## 방법 2: 무료 GLB 다운로드

### Sketchfab (추천)
1. https://sketchfab.com 접속
2. 검색: "camera low poly" / "drone" / "tent" 등
3. Filter: "Downloadable" + "glTF"
4. Download → GLB 선택
5. `public/models/` 폴더에 저장

### Poly Haven
1. https://polyhaven.com/models 접속
2. 원하는 모델 선택
3. Download → glTF 선택
4. `public/models/` 폴더에 저장

## 방법 3: 간단한 Blender 모델 만들기

### 1분만에 카메라 만들기
```
1. Blender 실행
2. 기본 Cube 선택
3. S (Scale) → 0.5 → Enter
4. E (Extrude) → 0.3 → Enter
5. Material 색상 변경 (검정)
6. File → Export → glTF 2.0 (.glb)
7. camera.glb로 저장
```

## 테스트용 기본 Geometry 코드

아래 코드를 `FloatingObjects.jsx`에 임시로 사용하세요:

```jsx
const FloatingObjects = memo(({ onCategoryClick }) => {
  const objects = [
    { id: 1, position: [-2, 1, 0], category: 'camera', color: '#333333' },
    { id: 2, position: [2, -1, -2], category: 'drone', color: '#666666' },
    { id: 3, position: [0, 2, -3], category: 'camping', color: '#228B22' },
    { id: 4, position: [-3, -2, -1], category: 'game', color: '#4169E1' },
    { id: 5, position: [3, 0, -4], category: 'sports', color: '#FF4500' }
  ];

  return (
    <group>
      {objects.map((obj) => (
        <Float key={obj.id} speed={1.5} rotationIntensity={0.5}>
          <mesh 
            position={obj.position} 
            onClick={() => onCategoryClick(obj.category)}
            onPointerOver={(e) => (e.object.scale.set(1.2, 1.2, 1.2))}
            onPointerOut={(e) => (e.object.scale.set(1, 1, 1))}
          >
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshStandardMaterial color={obj.color} />
          </mesh>
        </Float>
      ))}
    </group>
  );
});
```

