# 🏕️ tent.glb 최적화 가이드

## 📊 현재 상태
- **파일 크기**: 23.2 MB ⚠️ (전체의 80%)
- **Draco 압축 효과**: 9%만 감소 (폴리곤 수가 많음)
- **목표 크기**: 8~10 MB 이하

---

## 🎯 목표
**23.2 MB → 8~10 MB (60% 감소)**

---

## 🔧 최적화 방법 1: Blender에서 폴리곤 감소 (권장)

### 1단계: Blender에서 파일 열기
```
File → Open → tent.blend (또는 기존 파일)
```

### 2단계: 폴리곤 수 확인
```
1. 모델 선택
2. 우측 Scene Collection → Statistics 체크
3. 폴리곤(Faces) 수 확인

예상: 50,000~200,000 폴리곤 (너무 많음!)
목표: 10,000~30,000 폴리곤
```

### 3단계: Decimate Modifier 적용
```
1. 모델 선택
2. Properties 패널 → Modifiers (🔧 아이콘)
3. Add Modifier → Decimate
4. 설정:
   - Decimate Type: Collapse
   - Ratio: 0.3 ~ 0.5 (30~50%로 감소)
   
5. 미리보기로 확인 (디테일 손실 체크)
6. 적절한 Ratio 찾기 (0.4 추천)
7. Apply Modifier 클릭
```

**팁**: 
- Ratio 0.5 = 50%로 감소
- Ratio 0.3 = 30%로 감소 (더 공격적)
- 실시간 미리보기로 품질 확인!

### 4단계: 텍스처 해상도 확인 및 최적화

#### 텍스처 크기 확인
```
1. Shading 탭으로 이동
2. Shader Editor에서 Image Texture 노드 확인
3. Properties → Material → Base Color 이미지 확인
```

#### 텍스처가 4K (4096x4096) 이상이면:
```
1. UV Editing 탭
2. 이미지 선택
3. Image → Resize
4. 새 크기: 2048x2048 또는 1024x1024
5. Image → Save As → 저장
```

**권장 텍스처 크기**:
- 배경/큰 물체: 2048x2048
- 중간 물체: 1024x1024
- 작은 디테일: 512x512

### 5단계: Draco 압축 Export
```
File → Export → glTF 2.0 (.glb)

설정:
✅ Format: glTF Binary (.glb)
✅ Transform: +Y Up
✅ Geometry: Apply Modifiers
✅ Compression: Draco
   - Compression level: 6
   - Quantize Position: 14
   - Quantize Normal: 10
   - Quantize Texcoord: 12

저장 위치: public/models/tent.glb (기존 파일 덮어쓰기)
```

### 6단계: 결과 확인
```powershell
# PowerShell에서 파일 크기 확인
Get-Item "public/models/tent.glb" | Select Name, @{N="MB";E={[math]::Round($_.Length/1MB,2)}}
```

**기대 결과**:
- 23.2 MB → **8~10 MB** ✨
- 감소율: **약 60%**

---

## 🔧 최적화 방법 2: gltf-transform 도구 사용 (Blender 없을 때)

### 사전 준비
```bash
npm install -g @gltf-transform/cli
```

### 실행
```bash
# 1. 백업 생성
cp public/models/tent.glb public/models/tent_backup.glb

# 2. 폴리곤 50% 감소
gltf-transform simplify public/models/tent.glb public/models/tent_optimized.glb --ratio 0.5 --error 0.001

# 3. 텍스처 리사이즈 (2048x2048로)
gltf-transform resize public/models/tent_optimized.glb public/models/tent_final.glb --width 2048 --height 2048

# 4. Draco 재압축
gltf-transform draco public/models/tent_final.glb public/models/tent.glb

# 5. 크기 확인
ls -lh public/models/tent.glb
```

---

## 🔧 최적화 방법 3: 즉시 적용 가능한 코드 최적화

Blender 작업이 어렵다면, 코드에서 LOD (Level of Detail)를 적용하여 성능을 개선할 수 있습니다.

```jsx
import { Lod } from '@react-three/drei';

// 텐트 모델에 LOD 적용
<Lod distances={[0, 20, 40]}>
  <TentModelHigh />    {/* 0-20 units: 원본 */}
  <TentModelMedium />  {/* 20-40 units: 50% 폴리곤 */}
  <TentModelLow />     {/* 40+ units: 25% 폴리곤 */}
</Lod>
```

하지만 이 방법은 **임시방편**이고, 근본적으로 파일 크기를 줄이는 것이 최선입니다.

---

## 📊 최적화 전후 비교 예상

| 항목 | 최적화 전 | 최적화 후 | 개선 |
|------|-----------|-----------|------|
| 파일 크기 | 23.2 MB | **8~10 MB** | **60% ↓** |
| 폴리곤 수 | ~100,000 | ~40,000 | **60% ↓** |
| 로딩 시간 | ~3초 | **~1초** | **67% ↓** |
| 첫 렌더링 | 느림 | 빠름 | ✨ |

---

## ✅ 최적화 후 테스트

### 1. 개발 서버 실행
```bash
npm run dev
```

### 2. 확인 사항
- [ ] tent.glb 파일 크기 10MB 이하
- [ ] 홈페이지에서 텐트 섹션 정상 표시
- [ ] 디테일 손실 없음 (육안으로 확인)
- [ ] Network 탭에서 로딩 시간 1초 이내
- [ ] 프레임 드랍 없음 (부드러운 애니메이션)

### 3. 품질 비교
- 멀리서 보면 거의 차이 없음 ✅
- 가까이서 보면 약간 디테일 감소 (허용 범위) ✅
- 전체적인 실루엣은 동일 ✅

---

## 🚨 문제 해결

### 최적화 후 모델이 깨져 보여요
- **원인**: Ratio를 너무 낮게 설정 (0.2 이하)
- **해결**: Ratio를 0.4~0.5로 다시 시도

### 디테일이 너무 손실됐어요
- **원인**: Decimate가 너무 공격적
- **해결**: Ratio를 0.6~0.7로 높이기

### 여전히 파일이 커요
- **원인**: 텍스처가 큰 경우
- **해결**: 텍스처를 1024x1024로 리사이즈

---

## 🎉 완료 체크리스트

- [ ] tent.glb 백업 완료
- [ ] Decimate Modifier 적용 (Ratio: 0.4~0.5)
- [ ] 텍스처 해상도 확인 (2048 이하)
- [ ] Draco 압축 Export 완료
- [ ] 파일 크기 10MB 이하 확인
- [ ] 브라우저에서 정상 작동 확인
- [ ] 품질 체크 완료

---

## 💡 추가 팁

### 텐트 모델의 특성상
- 천막 부분은 폴리곤이 많아도 평평하므로 Decimate 효과가 좋음
- 프레임(골격)은 디테일이 중요하므로 vertex group으로 분리 가능
- 텍스처가 대부분의 디테일을 담당하므로 폴리곤 감소가 안전

### 최적의 Decimate Ratio
- **Ratio 0.5**: 균형잡힌 선택 (50% 감소)
- **Ratio 0.4**: 공격적 최적화 (60% 감소)
- **Ratio 0.6**: 보수적 선택 (40% 감소)

---

## 📞 도움이 필요하면

1. 백업 파일에서 복원
2. Ratio를 0.5로 다시 시도
3. 개발자 도구 콘솔 확인

**성공하시길 바랍니다!** 🏕️✨

