# Product Feature

상품 관리 관련 기능을 담당하는 feature입니다.

## 📋 책임 범위

- 상품 CRUD (생성, 조회, 수정, 삭제)
- 상품 찜하기/찜하기 취소
- 대여 불가 날짜 설정
- 상품 목록 조회 및 필터링

## 🏗️ 구조

```
product/
├── api/
│   └── productApi.js       # 상품 API 함수
├── components/
│   ├── ProductCard.jsx      # 상품 카드 컴포넌트
│   ├── ProductForm.jsx      # 상품 등록/수정 폼
│   ├── LikeButton.jsx       # 찜하기 버튼
│   └── UnavailableDateCalendar.jsx # 대여 불가 날짜 캘린더
├── hooks/
│   ├── useProducts.js      # 상품 목록 훅
│   ├── useProductLike.js   # 찜하기 훅
│   └── useUnavailableDates.js # 대여 불가 날짜 훅
├── pages/
│   ├── ProductListPage.jsx  # 상품 목록 페이지
│   ├── ProductDetailPage.jsx # 상품 상세 페이지
│   └── ProductManagementPage.jsx # 상품 관리 페이지
└── index.js                # Barrel Export
```

## 🔧 주요 기능

### useProducts 훅
- 상품 목록 조회
- 필터링 및 검색
- 페이지네이션
- 상품 CRUD 작업

### useProductLike 훅
- 찜하기/찜하기 취소
- 찜한 상품 목록 관리

### ProductCard 컴포넌트
- 상품 정보 표시
- 찜하기 버튼
- 클릭 이벤트 처리

## 📝 사용 예시

```jsx
import { useProducts, ProductCard } from '@/features/product';

function ProductList() {
  const { products, isLoading } = useProducts({
    category: 'electronics',
    location: '서울'
  });

  if (isLoading) return <div>로딩 중...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {products.map(product => (
        <ProductCard
          key={product.id}
          product={product}
          onClick={(id) => navigate(`/products/${id}`)}
        />
      ))}
    </div>
  );
}
```

## 🔗 API 엔드포인트

- `GET /products` - 상품 목록 조회
- `GET /products/:id` - 상품 상세 조회
- `POST /products` - 상품 생성
- `PUT /products/:id` - 상품 수정
- `DELETE /products/:id` - 상품 삭제
- `POST /products/:id/like` - 찜하기
- `DELETE /products/:id/like` - 찜하기 취소
- `PUT /products/:id/unavailable-dates` - 대여 불가 날짜 설정

## 🏷️ 상품 카테고리

### 주요 카테고리
- **전자기기**: 카메라, 노트북, 태블릿, 게임기
- **캠핑용품**: 텐트, 침낭, 버너, 랜턴
- **스포츠용품**: 자전거, 골프채, 스키, 보드
- **생활용품**: 청소기, 공기청정기, 가습기
- **도구**: 드릴, 전동공구, 측정기
- **의류**: 정장, 드레스, 액세서리
- **기타**: 악기, 도서, 완구

### 카테고리별 필터링
```javascript
const categoryFilters = {
  electronics: ['카메라', '노트북', '태블릿', '게임기'],
  camping: ['텐트', '침낭', '버너', '랜턴'],
  sports: ['자전거', '골프채', '스키', '보드'],
  living: ['청소기', '공기청정기', '가습기'],
  tools: ['드릴', '전동공구', '측정기'],
  fashion: ['정장', '드레스', '액세서리'],
  others: ['악기', '도서', '완구']
};
```

## 💰 가격 정책

### 대여료 계산
- **일일 대여료**: 상품 등록 시 설정
- **주간 할인**: 7일 이상 대여 시 10% 할인
- **월간 할인**: 30일 이상 대여 시 20% 할인

### 보증금 정책
```javascript
const calculateDeposit = (product) => {
  const baseDeposit = product.price * 0.3; // 상품 가격의 30%
  const minDeposit = 50000; // 최소 5만원
  const maxDeposit = 500000; // 최대 50만원
  
  return Math.min(Math.max(baseDeposit, minDeposit), maxDeposit);
};
```

## 📅 대여 날짜 관리

### 대여 불가 날짜
- 이미 대여 중인 날짜
- 상품 소유자가 설정한 불가 날짜
- 점검 및 수리 기간
- 공휴일 (선택사항)

### 날짜 검증
```javascript
const validateRentalDates = (startDate, endDate, unavailableDates) => {
  const rentalPeriod = getDatesInRange(startDate, endDate);
  const conflicts = rentalPeriod.filter(date => 
    unavailableDates.includes(date)
  );
  
  return conflicts.length === 0;
};
```

## 🔍 검색 및 필터링

### 검색 기능
- **키워드 검색**: 상품명, 설명, 태그
- **카테고리 필터**: 대분류, 소분류
- **지역 필터**: 법정동 기준 반경 설정
- **가격 필터**: 일일 대여료 범위
- **날짜 필터**: 대여 가능한 날짜

### 정렬 옵션
- 최신순 (기본)
- 인기순 (찜하기 수)
- 가격 낮은순
- 가격 높은순
- 거리순 (가까운 순)
- 평점순

## 🏆 신뢰도 시스템

### 상품 신뢰도 지표
- **평점**: 대여자들의 평가 (1-5점)
- **리뷰 수**: 실제 대여 후기 개수
- **대여 횟수**: 총 대여 완료 횟수
- **응답률**: 문의 응답 비율
- **반납률**: 정시 반납 비율

### 신뢰도 뱃지
```javascript
const getTrustBadge = (product) => {
  const { rating, reviewCount, rentalCount } = product;
  
  if (rating >= 4.8 && reviewCount >= 50) return '💎 최우수';
  if (rating >= 4.5 && reviewCount >= 20) return '⭐ 우수';
  if (rentalCount >= 100) return '🏆 인기';
  if (reviewCount >= 10) return '✅ 검증됨';
  
  return null;
};
```

## 🚀 개발 예정 사항

### Phase 1: 기본 상품 관리
- [x] 상품 CRUD
- [x] 찜하기 기능
- [x] 대여 불가 날짜 설정
- [x] 기본 필터링

### Phase 2: 고급 검색
- [ ] 전문 검색 (Elasticsearch)
- [ ] 자동완성 검색어
- [ ] 검색 히스토리
- [ ] 추천 상품 알고리즘

### Phase 3: 상품 관리 도구
- [ ] 상품 통계 대시보드
- [ ] 자동 가격 추천
- [ ] 재고 관리 시스템
- [ ] 상품 성과 분석

### Phase 4: AI 기능
- [ ] 이미지 기반 상품 인식
- [ ] 자동 카테고리 분류
- [ ] 가격 최적화 AI
- [ ] 개인화 추천 시스템

## 📸 이미지 관리

### 이미지 업로드 정책
- **최대 개수**: 10장
- **파일 크기**: 각 5MB 이하
- **지원 형식**: JPEG, PNG, WebP
- **해상도**: 최소 800x600, 권장 1200x900

### 이미지 최적화
```javascript
const optimizeImage = async (file) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // 리사이징 및 압축
  canvas.width = Math.min(file.width, 1200);
  canvas.height = Math.min(file.height, 900);
  
  // WebP 형식으로 변환
  return canvas.toBlob(callback, 'image/webp', 0.8);
};
```

## 📱 모바일 최적화

### 터치 인터랙션
- 스와이프로 이미지 갤러리 탐색
- 길게 눌러서 상품 미리보기
- 더블 탭으로 찜하기

### 성능 최적화
- 이미지 지연 로딩
- 무한 스크롤 페이지네이션
- 캐시 최적화

이 feature를 통해 다양한 상품을 효율적으로 관리하고 검색할 수 있습니다.