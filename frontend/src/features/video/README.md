# Video Feature

WebRTC 기반 영상 녹화 및 재생을 담당하는 feature입니다.

## 📋 책임 범위

- WebRTC 기반 영상 녹화
- 개봉 영상 촬영 가이드
- 녹화된 영상 재생
- 영상 파일 업로드 및 압축
- 분쟁 시 증거 자료 관리

## 🏗️ 구조

```
video/
├── components/
│   ├── VideoRecorder.jsx       # WebRTC 영상 녹화
│   └── VideoPlayer.jsx         # 녹화된 영상 재생
├── hooks/
│   └── useVideoRecorder.js     # 영상 녹화 관리 훅
└── index.js                    # Barrel Export
```

## 🔧 주요 기능

### VideoRecorder 컴포넌트
- WebRTC getUserMedia API 사용
- 실시간 카메라 피드 표시
- 녹화 시작/중지 제어
- 녹화 시간 표시
- 개봉 영상 촬영 가이드 제공

### VideoPlayer 컴포넌트
- 녹화된 영상 재생
- 재생/일시정지 제어
- 진행률 표시 및 탐색
- 영상 다운로드 기능

### useVideoRecorder 훅
- MediaRecorder API 관리
- 녹화 상태 관리
- Blob 데이터 처리
- 에러 처리

## 🎬 개봉 영상 촬영 가이드

### 수령 시 개봉 영상
1. **택배 박스 외부**: 모든 각도에서 촬영
2. **개봉 과정**: 박스를 열면서 촬영
3. **물건 확인**: 물건을 꺼내면서 촬영
4. **전체 검사**: 물건의 모든 면 천천히 촬영
5. **손상 부위**: 손상이 있다면 클로즈업 촬영
6. **부속품**: 부속품 및 액세서리 확인

### 반납 시 개봉 영상
1. **수령 시 영상과 비교**: 동일한 각도로 촬영
2. **상태 확인**: 사용 흔적 및 손상 여부 확인
3. **청결 상태**: 청소 상태 확인
4. **부속품 확인**: 누락된 부속품 확인

## 📝 사용 예시

```jsx
import { VideoRecorder, VideoPlayer, useVideoRecorder } from '@/features/video';

// 개봉 영상 녹화
function DeliveryVideoRecording({ onComplete }) {
  const handleRecordComplete = (videoBlob) => {
    console.log('녹화 완료:', videoBlob);
    onComplete(videoBlob);
  };
  
  return (
    <VideoRecorder
      onRecordComplete={handleRecordComplete}
      purpose="delivery" // 또는 "return"
    />
  );
}

// 녹화된 영상 재생
function VideoReview({ videoUrl }) {
  return (
    <VideoPlayer
      videoUrl={videoUrl}
      title="수령 시 개봉 영상"
      onClose={() => console.log('플레이어 닫기')}
    />
  );
}

// 커스텀 녹화 훅 사용
function CustomVideoRecorder() {
  const {
    isRecording,
    recordedBlob,
    recordingTime,
    startRecording,
    stopRecording,
    resetRecording,
    getBlobAsFile,
    getPreviewUrl
  } = useVideoRecorder();
  
  const handleStart = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });
    startRecording(stream);
  };
  
  return (
    <div>
      {!isRecording ? (
        <button onClick={handleStart}>녹화 시작</button>
      ) : (
        <button onClick={stopRecording}>녹화 중지 ({recordingTime}초)</button>
      )}
      
      {recordedBlob && (
        <video src={getPreviewUrl()} controls />
      )}
    </div>
  );
}
```

## 🔒 보안 및 개인정보 보호

### 카메라 권한 관리
- 사용자 동의 후에만 카메라 접근
- 권한 거부 시 적절한 안내 메시지
- 녹화 완료 후 카메라 스트림 해제

### 영상 데이터 보안
- 클라이언트에서 임시 저장만
- 서버 업로드 후 로컬 데이터 삭제
- HTTPS 통신 필수
- 영상 파일 암호화 저장

## 🎯 기술 요구사항

### 브라우저 지원
- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

### 영상 품질 설정
```javascript
const videoConstraints = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  frameRate: { ideal: 30 },
  facingMode: 'user' // 또는 'environment'
};

const audioConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true
};
```

### 파일 형식 및 압축
- **형식**: WebM (VP9 코덱) 또는 MP4 (H.264)
- **해상도**: 최대 720p
- **비트레이트**: 2Mbps 이하
- **최대 파일 크기**: 50MB
- **최소 녹화 시간**: 30초

## 🔗 FSM 연동

개봉 영상은 FSM 거래 시스템의 핵심 증거 자료입니다:

### 수령 확인 단계
- `AWAITING_DELIVERY_CONFIRMATION` 상태에서 필수 촬영
- 영상 업로드 완료 후 `IN_USE` 상태로 전환
- 분쟁 발생 시 핵심 증거 자료로 활용

### 반납 확인 단계
- `AWAITING_RETURN_CONFIRMATION` 상태에서 필수 촬영
- 수령 시 영상과 비교하여 손상 여부 판단
- 정상 확인 시 `COMPLETED`, 손상 발견 시 `DISPUTED` 전환

## 🚀 개발 예정 사항

### Phase 1: 기본 녹화 기능
- [x] WebRTC 영상 녹화
- [x] 실시간 미리보기
- [x] 녹화 시간 표시
- [x] 기본 재생 기능

### Phase 2: 고급 기능
- [ ] 영상 편집 (트림, 회전)
- [ ] 음성 인식 자막 생성
- [ ] 영상 품질 자동 조절
- [ ] 오프라인 녹화 지원

### Phase 3: AI 기능
- [ ] 물건 자동 인식
- [ ] 손상 부위 자동 감지
- [ ] 영상 요약 생성
- [ ] 유사도 비교 분석

## 🎨 UI/UX 고려사항

### 사용자 경험
- 직관적인 녹화 버튼 디자인
- 명확한 촬영 가이드 제공
- 실시간 피드백 (녹화 상태, 시간)
- 에러 상황 친화적 안내

### 접근성
- 키보드 네비게이션 지원
- 스크린 리더 호환
- 고대비 모드 지원
- 모션 감소 옵션

## 📚 참고 자료

- [WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [getUserMedia API](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)

이 feature를 통해 투명하고 신뢰할 수 있는 거래 환경을 제공합니다.
