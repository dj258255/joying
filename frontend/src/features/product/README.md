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
