# Product Feature

상품 관련 기능 모듈입니다.

## 📁 구조

```
product/
├── api/              # API 호출 함수
│   └── productApi.js
├── hooks/            # React Query 훅
│   └── useProducts.js
├── components/       # 컴포넌트
│   ├── HashtagFilter.jsx
│   └── ...
└── pages/            # 페이지
    └── ProductListMain.jsx
```

## 🎯 주요 기능

### 1. 상품 타입 분리
- **빌려줘 (lend)**: 대여 가능한 상품 목록
- **구해요 (borrow)**: 대여 요청 목록

### 2. API 구조

#### Mock 모드 (개발용)
`.env.development` 파일에서 설정:
```env
VITE_USE_MOCK=true
```

#### 실제 API 모드 (프로덕션)
`.env.production` 파일에서 설정:
```env
VITE_USE_MOCK=false
VITE_API_BASE_URL=https://api.yourapp.com/api/v1
```

## 🔧 사용 방법

### 1. 상품 목록 조회

```javascript
import { useProducts } from '@/features/product/hooks/useProducts';

function ProductList() {
  const { data, isLoading, isError } = useProducts({
    type: 'lend',        // 'lend' | 'borrow'
    search: '닌텐도',
    category: '게임기',
    minPrice: 10000,
    maxPrice: 50000,
    location: '서울시 강남구',
    minRating: 4.0,
    sameDayRental: true,
    hashtags: ['게임', '캠핑'],
    startDate: '2024-01-20',
    endDate: '2024-01-25'
  });

  if (isLoading) return <div>로딩 중...</div>;
  if (isError) return <div>에러 발생</div>;

  return (
    <div>
      <p>총 {data.total}개의 상품</p>
      {data.items.map(product => (
        <div key={product.id}>{product.title}</div>
      ))}
    </div>
  );
}
```

### 2. 빌려줘 상품만 조회

```javascript
import { useLendProducts } from '@/features/product/hooks/useProducts';

function LendProductList() {
  const { data, isLoading } = useLendProducts({
    search: '캠핑',
    minPrice: 10000
  });

  // ...
}
```

### 3. 구해요 상품만 조회

```javascript
import { useBorrowProducts } from '@/features/product/hooks/useProducts';

function BorrowProductList() {
  const { data, isLoading } = useBorrowProducts({
    location: '서울시'
  });

  // ...
}
```

### 4. 상품 생성

```javascript
import { useCreateProduct } from '@/features/product/hooks/useProducts';

function CreateProductForm() {
  const createProduct = useCreateProduct();

  const handleSubmit = async (formData) => {
    try {
      await createProduct.mutateAsync({
        type: 'lend',  // 'lend' | 'borrow'
        title: '닌텐도 스위치',
        description: '최신 OLED 모델',
        price: 15000,
        deposit: 100000,
        location: '서울시 강남구',
        category: '게임기',
        // ...
      });
      alert('상품이 등록되었습니다!');
    } catch (error) {
      alert('등록 실패');
    }
  };

  // ...
}
```

## 🔄 API 전환 가이드

### Mock → 실제 API 전환 시

1. **환경 변수 변경**
   ```env
   VITE_USE_MOCK=false
   VITE_API_BASE_URL=https://api.yourapp.com/api/v1
   ```

2. **API 함수 수정 (필요시)**
   `src/features/product/api/productApi.js`에서 주석 처리된 실제 API 호출 코드 활성화:
   
   ```javascript
   export const getProducts = async (params = {}) => {
     if (USE_MOCK) {
       // Mock 로직...
     }

     // 실제 API 호출 (주석 해제)
     const { data } = await axiosInstance.get('/products', { params });
     return data;
   };
   ```

3. **응답 형식 확인**
   백엔드 API 응답 형식이 다음과 같은지 확인:
   ```json
   {
     "items": [...],
     "total": 100,
     "page": 1,
     "limit": 20,
     "totalPages": 5
   }
   ```

   형식이 다르면 `productApi.js`에서 변환 로직 추가:
   ```javascript
   const { data } = await axiosInstance.get('/products', { params });
   
   // 응답 형식 변환
   return {
     items: data.products,      // 백엔드 필드명에 맞게 수정
     total: data.totalCount,    // 백엔드 필드명에 맞게 수정
     page: data.currentPage,
     limit: data.pageSize,
     totalPages: data.totalPages
   };
   ```

## 📊 데이터 구조

### 상품 객체 (Product)

```typescript
{
  id: string;              // 상품 ID
  title: string;           // 상품명
  description: string;     // 설명
  price: number;          // 일일 대여료
  deposit: number;        // 보증금
  location: string;       // 지역
  image: string;          // 대표 이미지 URL
  images: string[];       // 이미지 URL 배열
  sellerId?: number;      // 판매자 ID (lend)
  requesterId?: number;   // 요청자 ID (borrow)
  category: string;       // 카테고리
  condition: string;      // 상태 ('excellent', 'good', 'fair', 'any')
  isAvailable?: boolean;  // 대여 가능 여부 (lend)
  isActive?: boolean;     // 활성 상태 (borrow)
  rating: number;         // 평점
  reviewCount: number;    // 리뷰 수
  type?: string;          // 타입 ('lend' | 'borrow')
  createdAt: string;      // 생성일
  updatedAt: string;      // 수정일
}
```

## 🎨 컴포넌트 사용 예시

### ProductListMain.jsx
- 상품 목록 페이지
- 필터링 기능 (검색, 카테고리, 가격, 지역, 평점 등)
- 빌려줘/구해요 탭 전환
- 해시태그 검색
- 반응형 디자인 (데스크톱/모바일)

## 🚀 향후 개선 사항

- [ ] 무한 스크롤 구현
- [ ] 상품 정렬 기능 (최신순, 인기순, 가격순)
- [ ] 지도 뷰 추가
- [ ] 상품 비교 기능
- [ ] 찜하기 기능
- [ ] 최근 본 상품
