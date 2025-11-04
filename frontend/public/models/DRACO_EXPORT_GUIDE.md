# 🚀 Draco 압축 GLB Export 가이드

현재 파일 크기: **60.8 MB** → Draco 적용 후 예상: **18~25 MB** (60% 감소)

## 📦 파일별 현재 크기
- `camera.glb`: 6.8 MB
- `tent.glb`: 24.4 MB 
- `gamepad.glb`: 29.6 MB ⚠️ (가장 큰 파일)

---

## 🎨 Blender에서 Draco 압축 Export 방법

### 1단계: Blender에서 모델 열기
```
File → Open → 해당 .blend 파일 선택
```

### 2단계: Export 설정
```
File → Export → glTF 2.0 (.glb/.gltf)
```

### 3단계: 중요한 설정들 (반드시 확인!)

#### ✅ Format 탭
- **Format**: `glTF Binary (.glb)` 선택
- **Remember Export Settings**: 체크

#### ✅ Include 탭
- **Selected Objects**: 선택한 오브젝트만 (또는 전체)
- **Custom Properties**: 체크
- **Cameras**: 해제 (Three.js에서 안 씀)
- **Punctual Lights**: 필요시 체크

#### ✅ Transform 탭
- **+Y Up**: 체크 ✅ (Three.js 호환 필수!)
- **Scale**: 1.0

#### ✅ Geometry 탭
- **Apply Modifiers**: 체크 ✅
- **UVs**: 체크
- **Normals**: 체크
- **Tangents**: 체크
- **Materials**: Export
- **Compression**: 여기서 설정하지 않음 (아래에서)

#### 🔥 Compression 탭 (핵심!)
- **Compression**: `Draco` 선택 ⭐⭐⭐
- **Compression level**: 6 (기본값, 0~10 범위)
- **Quantize Position**: `14` (높을수록 정밀, 12~14 권장)
- **Quantize Normal**: `10` (법선 벡터, 8~10 권장)
- **Quantize Texcoord**: `12` (UV 좌표, 10~12 권장)
- **Quantize Color**: `10`
- **Quantize Generic**: `12`

> 💡 **Tip**: Quantize 값이 높을수록 품질 좋지만 파일 커짐. 14/10/12가 최적 밸런스!

#### ✅ Animation 탭 (애니메이션 없으면 스킵)
- **Animation**: 체크 해제 (현재 프로젝트는 애니메이션 없음)

### 4단계: Export 실행
```
1. 파일명 확인: camera.glb / tent.glb / gamepad.glb
2. 저장 위치: S13P31C202/frontend/public/models/
3. "Export glTF 2.0" 버튼 클릭
4. 기존 파일 덮어쓰기 (Yes)
```

---

## 🎯 추가 최적화 팁

### 폴리곤 수 줄이기 (더 큰 효과!)

현재 gamepad.glb가 29.6MB인 이유는 폴리곤이 너무 많을 가능성이 큽니다.

```
1. Blender에서 모델 선택
2. Modifiers 패널 → Add Modifier → Decimate
3. Ratio: 0.5 ~ 0.7 (50~70%로 감소)
4. Apply Modifier
5. 다시 Draco 압축으로 Export
```

**예상 결과**:
- gamepad.glb: 29.6 MB → **8~12 MB** 😍

### 텍스처 최적화 (선택사항)

만약 텍스처가 있다면:
```
1. UV Editing 모드
2. Texture 선택
3. Image → Resize → 2048x2048 또는 1024x1024
4. 저장 포맷: PNG → JPG (알파 채널 불필요 시)
```

---

## ✅ Export 후 확인사항

### 파일 크기 확인
```powershell
# PowerShell에서
dir "S13P31C202\frontend\public\models\*.glb" | Select Name, @{N="MB";E={[math]::Round($_.Length/1MB,2)}}
```

**기대하는 결과**:
- camera.glb: 6.8 MB → **2~3 MB**
- tent.glb: 24.4 MB → **7~10 MB**  
- gamepad.glb: 29.6 MB → **9~12 MB**
- **총합**: 60.8 MB → **18~25 MB** ✨

### 브라우저에서 테스트
```bash
npm run dev
```

1. 홈페이지 접속
2. 개발자 도구 (F12) → Network 탭
3. .glb 파일 로딩 시간 확인
4. 3D 모델이 정상적으로 표시되는지 확인

---

## ⚠️ 주의사항

### Draco 압축 후 발생 가능한 문제

1. **모델이 안 보여요**
   - 원인: Quantize 값을 너무 낮게 설정
   - 해결: Position=14, Normal=10, Texcoord=12로 재 export

2. **디테일이 떨어져 보여요**
   - 원인: Compression level이 너무 높음 (10)
   - 해결: Compression level을 6으로 낮추기

3. **로딩은 빨라졌는데 프레임 드랍**
   - 원인: 디코딩 과정에서 CPU 부하
   - 해결: 정상입니다. 초기 디코딩 후에는 문제없음

4. **색상이 이상해요**
   - 원인: Material 설정 누락
   - 해결: Include 탭에서 "Materials" 체크 확인

---

## 🔍 검증 방법

### 1. Draco 압축 적용 여부 확인
```javascript
// 브라우저 콘솔에서
console.log('Draco 활성화:', !!THREE.DRACOLoader);
```

### 2. 파일 크기 비교
```
압축 전: 60.8 MB
압축 후: ??? MB (목표 25MB 이하)
감소율: ??? %
```

### 3. 로딩 시간 비교
```
압축 전: Network 탭에서 측정
압축 후: Network 탭에서 측정
개선율: ??? %
```

---

## 📚 참고 자료

- [glTF Draco 공식 문서](https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_draco_mesh_compression/README.md)
- [Blender glTF Exporter](https://docs.blender.org/manual/en/latest/addons/import_export/scene_gltf2.html)
- [Three.js DRACOLoader](https://threejs.org/docs/#examples/en/loaders/DRACOLoader)

---

## 🎉 완료 후 확인

- [ ] 세 파일 모두 Draco 압축 적용
- [ ] 총 파일 크기 25MB 이하
- [ ] 브라우저에서 정상 작동
- [ ] 로딩 시간 50% 이상 단축
- [ ] 3D 모델 품질 유지 (디테일 손실 없음)

**작업 완료 후 개발 서버를 재시작하고 테스트하세요!** 🚀

