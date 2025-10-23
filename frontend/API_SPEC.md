# API_SPEC.md — P2P 취미대여 (Vibe-Coding Friendly)

> **Base URL**: `{BASE_URL}/api/v1`  
> **Auth**: `Bearer <access_token>` (로그인 필요 없는 항목은 표기)  
> **Headers**:  
> - `Authorization: Bearer <token>` (필요 시)  
> - `Content-Type: application/json` (파일 업로드는 `multipart/form-data`)  
> **에러 표준(제안)**:
> ```json
> { "timestamp": "2025-01-01T12:34:56Z", "status": 400, "code": "VALIDATION_ERROR", "message": "...", "path": "/product/1" }
> ```
> **페이지네이션(제안)**: `page`, `size`, (채팅은 `before_message_id`)  
> **시간/ID 규칙(제안)**: ISO8601 UTC, ID는 숫자 또는 UUID 일관 사용

---

## Auth
| 기능 | 메서드 | URL (Base 이후) | 로그인 |
|---|---|---|---|
| 카카오 로그인 | `POST` | `/oauth2/authorization/kakao` | ❌ |
| 로그아웃 | `POST` | `/auth/logout` | ✅ |
| 엑세스 토큰 갱신 | `POST` | `/auth/refresh` | ✅ |
| 현재 로그인 사용자 보기 | `GET` | `/auth/me` | ✅ |

---

## Chat
> 실시간 메시지는 **WebSocket** 사용: `wss://api.example.com/ws/chat`

| 기능 | 메서드 | URL | 로그인 |
|---|---|---|---|
| 채팅방 생성 | `POST` | `/chat-rooms` | ✅ |
| 내 채팅방 목록 조회 | `GET` | `/chat-rooms?member=me&page={page}&size={size}` | ✅ |
| 채팅방 상세 조회 | `GET` | `/chat-rooms/{chat_room_id}` | ✅ |
| 파일/이미지 전송 | `POST` | `/chat-rooms/{chat_room_id}/messages` (`multipart/form-data`) | ✅ |
| 메시지 목록 조회(채팅 내역) | `GET` | `/chat-rooms/{chat_room_id}/messages?page={page}&size={size}&before_message_id={message_id}` | ✅ |
| 답장 메시지 전송 | `POST` | `/chat-rooms/{chat_room_id}/messages` | ✅ |
| 메시지 읽음 처리 | `POST` | `/messages/{message_id}/read` | ✅ |
| 채팅방 고정/해제 | `PATCH` | `/chat-rooms/{chat_room_id}/members/{member_id}/pin` | ✅ |
| 채팅방 알림/설정(뮤트) | `PATCH` | `/chat-rooms/{chat_room_id}/members/{member_id}/mute` | ✅ |
| 채팅방 나가기 | `POST` | `/chat-rooms/{chat_room_id}/members/{member_id}` | ✅ |
| 대여 요청(시스템 메시지) | `POST` | `/chat-rooms/{chat_room_id}/rental-request` | ✅ |
| 웹소켓 | `WS` | `wss://api.example.com/ws/chat` | — |

---

## Payment
| 기능 | 메서드 | URL | 로그인 |
|---|---|---|---|
| 결제 금액 조회(견적) | `GET` | `/payment/quote?=rentalId={id}` | — |
| 결제 생성 | `POST` | `/payment` | — |
| 결제 상세 조회 | `GET` | `/payment/{paymentId}` | — |
| 결제 취소 | `PATCH` | `/payment` | — |
| 환불 | `POST` | `/payments/{paymentId}/refund` | — |
| 결제 웹훅 수신(성공/실패/부정사용) | `POST` | `/payment/result` | — |

---

## Product
| 기능 | 메서드 | URL | 로그인 |
|---|---|---|---|
| 상품 조회 | `GET` | `/product/{productId}` | ❌ |
| 상품 등록 | `POST` | `/product` | ✅ |
| 상품 수정 | `PATCH` | `/product/{productId}` | ✅ |
| 상품 삭제 | `DELETE` | `/product/{productId}` | ✅ |
| 상품 찜하기(토글) | `POST` | `/product/{productId}/like` | ✅ |
| 상품 찜 취소 | `DELETE` | `/product/{productId}/dislike` | ✅ |
| 대여 불가 날짜 설정 | `POST` | `/product/{productId}/disable` | ❌ |

---

## Review
| 기능 | 메서드 | URL | 로그인 |
|---|---|---|---|
| 게시글 리뷰 리스트 조회 | `GET` | `/review/rental/{rentalId}?page={page}&size={size}` | ✅ |
| 인물 리뷰 리스트 조회 | `GET` | `/review/member/{memberId}?page={page}&size={size}` | ❌ |
| 대여에 작성한 리뷰 조회 | `GET` | `/review/rental/{rentalId}/member/{memberId}` | ✅ |
| 게시글 리뷰 작성(빌린/빌려준) | `POST` | `/review/rental/{rentalId}` | ✅ |
| 리뷰 수정 | `PATCH` | `/review/{reviewId}` | ✅ |
| 리뷰 삭제 | `DELETE` | `/review/{reviewId}` | ✅ |

---

## Search
| 기능 | 메서드 | URL | 로그인 |
|---|---|---|---|
| 검색 API | `GET` | `/search?q=&price_min=&price_max=&region=&date_to=&date_from=&rating=&method=&category=[]&hashtag=[]` | ❌ |

---

## Hashtag
| 기능 | 메서드 | URL | 로그인 |
|---|---|---|---|
| 해시태그 조회 | `GET` | `/hashtag` | ❌ |
| 해시태그 생성 | `POST` | `/hashtag` | ✅ |

---

## Category
| 기능 | 메서드 | URL | 로그인 |
|---|---|---|---|
| 상위 카테고리 조회 | `GET` | `/category` | ❌ |
| 하위 카테고리 조회 | `GET` | `/category/{categoryId}` | ❌ |
| 카테고리 생성 | `POST` | `/category` | ✅ |

---

## User
| 기능 | 메서드 | URL | 로그인 |
|---|---|---|---|
| 회원 수정(계좌 수정 등) | `PATCH` | `/user` | ✅ |
| 회원 탈퇴 | `DELETE` | `/user` | ✅ |
| 회원 정보 조회 | `GET` | `/user` | ✅ |
| 프로필 이미지 등록 | `POST` | `/user/profile-image` | ✅ |
| 프로필 이미지 변경 | `PATCH` | `/user/profile-image` | ✅ |
| 프로필 이미지 삭제 | `DELETE` | `/user/profile-image` | ✅ |
| 계좌인증 | `POST` | `/v1/accounts/verify` | ✅ |

---

## Mypage
| 기능 | 메서드 | URL | 로그인 |
|---|---|---|---|
| 나의 대여 내역 | `GET` | `/mypage/borrowed/history` | ✅ |
| 내가 대여해준 내역 | `GET` | `/mypage/lend/history` | ✅ |
| 등록한 상품 목록 | `GET` | `/mypage/items` | ✅ |
| 관심 상품 조회 | `GET` | `/mypage/likes` | ✅ |
| 내 채팅방 목록 조회 | `GET` | `/mypage/chats` | ✅ |

---

## 샘플 cURL (바로 붙여쓰기)
```bash
# 로그인 사용자 조회
curl -H "Authorization: Bearer $TOKEN" \
  {BASE_URL}/api/v1/auth/me

# 상품 등록
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{ "name":"소니 A7M4", "pricePerDay":30000, "deposit":100000, "categoryId":1 }' \
  {BASE_URL}/api/v1/product

# 채팅 메시지 전송 (텍스트)
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{ "type":"text", "content":"안녕하세요!" }' \
  {BASE_URL}/api/v1/chat-rooms/{chat_room_id}/messages

# 채팅 파일 전송
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/image.jpg" \
  {BASE_URL}/api/v1/chat-rooms/{chat_room_id}/messages

# 검색
curl "{BASE_URL}/api/v1/search?q=카메라&price_min=0&price_max=50000&category[]=camera&region=seoul&page=1&size=20"
```

---

## TODO
- `Chat` 목록 URL 오타(`/char-rooms` → `/chat-rooms`)
- Request/Response 스키마 확정
- Payment 웹훅 시그니처 정의
- 파일 업로드 크기/확장자 정책
- 검색 필드 구체화
- 대여 불가 날짜 `disable` 포맷 결정
