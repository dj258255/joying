# Shipping Feature

배송 추적 및 송장번호 관리를 담당하는 feature입니다.

## 📋 책임 범위

- 송장번호 입력 및 검증
- 실시간 배송 상태 추적
- 배송 완료 알림
- 배송 히스토리 관리
- 택배사 API 연동

## 🏗️ 구조

```
shipping/
├── api/
│   └── shippingApi.js          # 배송 추적 API
├── components/
│   ├── TrackingNumberInput.jsx # 송장번호 입력 모달
│   └── ShippingStatusCard.jsx  # 배송 상태 표시 카드
├── hooks/
│   └── useShippingTracker.js   # 배송 추적 훅
└── index.js                    # Barrel Export
```

## 🔧 주요 기능

### TrackingNumberInput 컴포넌트
- 택배사 선택 (CJ대한통운, 우체국택배, 롯데택배 등)
- 송장번호 입력 및 유효성 검사
- 발송/반납 구분 처리

### ShippingStatusCard 컴포넌트
- 배송 상태 실시간 표시
- 진행률 프로그레스 바
- 배송 단계별 상태 표시
- 배송 완료 시 알림

### useShippingTracker 훅
- 배송 상태 1분마다 폴링
- 배송 완료 자동 감지
- 모의 배송 시뮬레이션 (개발용)

## 🚀 배송 상태 플로우

```
PENDING (집화 대기)
    ↓
COLLECTED (집화 완료)
    ↓
IN_TRANSIT (배송 중)
    ↓
OUT_FOR_DELIVERY (배송 출발)
    ↓
DELIVERED (배송 완료)
```

## 📝 사용 예시

```jsx
import { TrackingNumberInput, ShippingStatusCard, useShippingTracker } from '@/features/shipping';

// 송장번호 입력
function ShippingInputModal() {
  const [isOpen, setIsOpen] = useState(false);
  
  const handleSubmit = async (data) => {
    console.log('송장번호 등록:', data);
    setIsOpen(false);
  };
  
  return (
    <TrackingNumberInput
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      onSubmit={handleSubmit}
      type="outbound" // 또는 "return"
    />
  );
}

// 배송 상태 표시
function ShippingStatus({ trackingNumber, courier }) {
  const { status, isLoading } = useShippingTracker(trackingNumber, courier);
  
  if (isLoading) return <div>배송 상태 확인 중...</div>;
  
  return (
    <ShippingStatusCard
      trackingNumber={trackingNumber}
      courier={courier}
      status={status}
      type="outbound"
    />
  );
}
```

## 🔗 FSM 연동

배송 추적은 FSM 거래 시스템과 밀접하게 연동됩니다:

- `AWAITING_OUTBOUND_SHIPPING` → 송장번호 입력 → `OUTBOUND_SHIPPING_IN_PROGRESS`
- `OUTBOUND_SHIPPING_IN_PROGRESS` → 배송 완료 감지 → `AWAITING_DELIVERY_CONFIRMATION`
- `AWAITING_RETURN_SHIPPING` → 송장번호 입력 → `RETURN_SHIPPING_IN_PROGRESS`
- `RETURN_SHIPPING_IN_PROGRESS` → 배송 완료 감지 → `AWAITING_RETURN_CONFIRMATION`

## 🚀 개발 예정 사항

### Phase 1: 기본 배송 추적
- [x] 송장번호 입력 모달
- [x] 배송 상태 카드
- [x] 모의 배송 시뮬레이션
- [ ] 실제 택배사 API 연동

### Phase 2: 고급 기능
- [ ] 배송 알림 (푸시, 이메일)
- [ ] 배송 예상 시간 계산
- [ ] 배송 히스토리 저장
- [ ] 배송 문제 신고 기능

### Phase 3: 최적화
- [ ] 배송 상태 캐싱
- [ ] 오프라인 지원
- [ ] 배송 통계 분석

## 📚 참고 자료

- [CJ대한통운 API](https://www.cjlogistics.com/ko/tool/parcel/tracking)
- [우체국택배 API](https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm)
- [롯데택배 API](https://www.lotteglogis.com/home/reservation/tracking/linkView)

이 feature를 통해 사용자는 실시간으로 배송 상태를 확인할 수 있습니다.
