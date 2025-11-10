# API 및 WebSocket 연동 가이드

이 문서는 채팅, 결제 기능을 프론트엔드에서 연동할 때 필요한 모든 정보를 정리한 문서입니다.

## 📋 목차

1. [채팅 API 엔드포인트](#채팅-api-엔드포인트)
2. [WebSocket 채팅 설정](#websocket-채팅-설정)
3. [결제 API 엔드포인트](#결제-api-엔드포인트)
4. [인증 방식](#인증-방식)
5. [프론트엔드 연동 예시](#프론트엔드-연동-예시)

---

## 채팅 API 엔드포인트

### Base URL
- 개발: `http://localhost:8080/api/v1`
- 프로덕션: `https://k13c202.p.ssafy.io/api/v1`

### 1. 채팅방 생성 또는 조회
**POST** `/api/v1/chat-rooms`

**Request Body:**
```json
{
  "productId": 12
}
```

**Response (200 OK):**
```json
{
  "status": 200,
  "message": "채팅방이 생성되었습니다",
  "data": {
    "chatRoomId": 2,
    "productId": 12,
    "productTitle": "상품명",
    "productImageUrl": "https://...",
    "otherMemberId": 6,
    "otherMemberNickname": "상대방 닉네임",
    "otherMemberProfileUrl": "https://...",
    "lastMessage": null,
    "lastMessageAt": null,
    "unreadCount": 0,
    "status": "ACTIVE",
    "isPinned": false,
    "isMuted": false,
    "member": null
  },
  "timestamp": "2025-11-06T15:31:14.1643951"
}
```

### 2. 내 채팅방 목록 조회
**GET** `/api/v1/chat-rooms`

**Response (200 OK):**
```json
{
  "status": 200,
  "message": "채팅방 목록 조회 완료",
  "data": [
    {
      "chatRoomId": 2,
      "productId": 12,
      "productTitle": "상품명",
      "productImageUrl": "https://...",
      "otherMemberId": 6,
      "otherMemberNickname": "상대방 닉네임",
      "otherMemberProfileUrl": "https://...",
      "lastMessage": "안녕하세요",
      "lastMessageAt": "2025-11-06T15:30:00",
      "unreadCount": 3,
      "status": "ACTIVE",
      "isPinned": false,
      "isMuted": false
    }
  ],
  "timestamp": "2025-11-06T15:31:14.1643951"
}
```

**Response Headers:**
- `X-Total-Unread-Count`: 총 안읽은 메시지 개수

### 3. 채팅방 상세 조회
**GET** `/api/v1/chat-rooms/{chatRoomId}`

**Query Parameters:**
- `include` (optional): `member` - 참여자 온라인 상태 포함

**Response (200 OK):**
```json
{
  "status": 200,
  "message": "채팅방 상세 조회 완료",
  "data": {
    "chatRoomId": 2,
    "productId": 12,
    "productTitle": "상품명",
    "productImageUrl": "https://...",
    "otherMemberId": 6,
    "otherMemberNickname": "상대방 닉네임",
    "otherMemberProfileUrl": "https://...",
    "lastMessage": "안녕하세요",
    "lastMessageAt": "2025-11-06T15:30:00",
    "unreadCount": 3,
    "status": "ACTIVE",
    "isPinned": false,
    "isMuted": false,
    "member": {
      "isOnline": true,
      "lastSeenAt": "2025-11-06T15:31:00"
    }
  },
  "timestamp": "2025-11-06T15:31:14.1643951"
}
```

### 4. 채팅방 나가기
**DELETE** `/api/v1/chat-rooms/{chatRoomId}`

**Response:** 204 No Content

### 5. 채팅방 설정 업데이트
**PATCH** `/api/v1/chat-rooms/{chatRoomId}/settings`

**Request Body:**
```json
{
  "isPinned": true,
  "isMuted": false
}
```

**Response (200 OK):**
```json
{
  "status": 200,
  "message": "채팅방 설정이 업데이트되었습니다",
  "data": {
    "isPinned": true,
    "isMuted": false
  },
  "timestamp": "2025-11-06T15:31:14.1643951"
}
```

### 6. 메시지 목록 조회
**GET** `/api/v1/chat-rooms/{chatRoomId}/messages`

**Query Parameters:**
- `size` (optional, default: 20): 가져올 메시지 개수
- `before` (optional): ISO8601 형식 - 이 시간 이전의 메시지 조회
- `after` (optional): ISO8601 형식 - 이 시간 이후의 메시지 조회
- `keyword` (optional): 검색 키워드 (검색 모드)
- `page` (optional, default: 0): 페이지 번호 (검색 모드에서만 사용)

**Response (200 OK):**
```json
{
  "status": 200,
  "message": "메시지 목록 조회 완료",
  "data": [
    {
      "id": "message_id",
      "chatRoomId": 2,
      "senderId": 5,
      "sender": {
        "id": 5,
        "nickname": "사용자",
        "profileImageUrl": "https://..."
      },
      "type": "TEXT",
      "content": "안녕하세요",
      "imageUrl": null,
      "fileUrl": null,
      "fileName": null,
      "fileSize": null,
      "replyToMessageId": null,
      "createdAt": "2025-11-06T15:30:00",
      "updatedAt": "2025-11-06T15:30:00",
      "isDeleted": false
    }
  ],
  "timestamp": "2025-11-06T15:31:14.1643951"
}
```

### 7. 메시지 삭제
**DELETE** `/api/v1/chat-rooms/{chatRoomId}/messages/{messageId}`

**Response:** 204 No Content

### 8. 메시지 수정
**PATCH** `/api/v1/chat-rooms/{chatRoomId}/messages/{messageId}`

**Request Body:**
```json
{
  "content": "수정된 메시지 내용"
}
```

**Response (200 OK):**
```json
{
  "status": 200,
  "message": "메시지가 수정되었습니다",
  "data": {
    "id": "message_id",
    "content": "수정된 메시지 내용",
    "updatedAt": "2025-11-06T15:31:00"
  },
  "timestamp": "2025-11-06T15:31:14.1643951"
}
```

### 9. 파일 업로드
**POST** `/api/v1/chat-rooms/{chatRoomId}/upload`

**Request:** `multipart/form-data`
- `file`: 파일 (이미지 또는 일반 파일)

**Response (200 OK):**
```json
{
  "status": 200,
  "message": "파일 업로드 완료",
  "data": {
    "fileId": "file_id",
    "url": "https://...",
    "fileName": "image.jpg",
    "fileSize": 102400,
    "fileType": "IMAGE"
  },
  "timestamp": "2025-11-06T15:31:14.1643951"
}
```

---

## WebSocket 채팅 설정

### WebSocket 엔드포인트
- **Endpoint**: `/ws/chat`
- **프로토콜**: STOMP over SockJS
- **인증 방식**: 쿠키 기반 (`Cookie: access_token={JWT_TOKEN}`)

### 연결 설정
```javascript
// WebSocket URL 생성
const wsUrl = 'ws://localhost:8080/ws/chat'; // 개발 환경
// 또는
const wsUrl = 'wss://k13c202.p.ssafy.io/ws/chat'; // 프로덕션 환경

// SockJS + STOMP 사용
const socket = new SockJS(wsUrl);
const stompClient = Stomp.over(socket);

// 연결 (쿠키는 자동으로 전송됨)
stompClient.connect(
  {}, // 빈 헤더 - 쿠키 기반 인증
  (frame) => {
    console.log('WebSocket 연결 성공:', frame);
  },
  (error) => {
    console.error('WebSocket 연결 실패:', error);
  }
);
```

### STOMP Destination

#### 클라이언트 → 서버 (SEND)
- 메시지 전송: `/app/chat/{chatRoomId}/send`
- 타이핑 표시: `/app/chat/{chatRoomId}/typing`
- 읽음 처리: `/app/chat/{chatRoomId}/read`
- Heartbeat: `/app/chat/heartbeat`

#### 서버 → 클라이언트 (SUBSCRIBE)
- 메시지 수신: `/topic/chat/{chatRoomId}`
- 읽음 상태: `/topic/chat/{chatRoomId}/read`
- 타이핑 상태: `/topic/chat/{chatRoomId}/typing`

### 메시지 형식

#### 메시지 전송 (클라이언트 → 서버)
```json
{
  "type": "TEXT",
  "content": "메시지 내용",
  "imageUrl": null,
  "fileUrl": null,
  "fileName": null,
  "fileSize": null,
  "replyToMessageId": null
}
```

**메시지 타입:**
- `TEXT`: 텍스트 메시지
- `IMAGE`: 이미지 메시지
- `FILE`: 파일 메시지
- `SYSTEM`: 시스템 메시지

#### 메시지 수신 (서버 → 클라이언트)
```json
{
  "id": "message_id",
  "chatRoomId": 2,
  "senderId": 5,
  "sender": {
    "id": 5,
    "nickname": "사용자",
    "profileImageUrl": "https://..."
  },
  "type": "TEXT",
  "content": "메시지 내용",
  "imageUrl": null,
  "fileUrl": null,
  "fileName": null,
  "fileSize": null,
  "replyToMessageId": null,
  "createdAt": "2025-11-06T15:30:00",
  "updatedAt": "2025-11-06T15:30:00",
  "isDeleted": false
}
```

#### 타이핑 표시 (클라이언트 → 서버)
```json
{
  "isTyping": true
}
```

#### 읽음 처리 (클라이언트 → 서버)
```json
{
  "messageId": "message_id"
}
```

### 인증 처리 흐름

1. 클라이언트가 `/ws/chat` 엔드포인트로 SockJS 연결 시도
2. STOMP CONNECT 프레임 전송 (쿠키 자동 포함, 헤더는 빈 객체 `{}`)
3. `WebSocketAuthInterceptor`가 쿠키에서 `access_token` 추출
4. JWT 토큰 유효성 검증
5. SecurityContext에 인증 정보 설정
6. STOMP 세션에 user principal 설정
7. `WebSocketEventListener`가 즉시 온라인 상태로 설정

**중요**: 별도로 Authorization 헤더를 전달할 필요가 없습니다. 쿠키에 저장된 JWT 토큰을 자동으로 사용합니다.

---

## 결제 API 엔드포인트

### 1. 결제 생성 (OrderId 발급)
**POST** `/api/v1/payments`

**Request Body:**
```json
{
  "rentalHisId": 1,
  "productId": 12,
  "totalAmount": 50000,
  "orderName": "상품명 대여(보증금 포함)"
}
```

**Response (200 OK):**
```json
{
  "status": 200,
  "message": "결제가 생성되었습니다",
  "data": {
    "paymentId": 1,
    "orderId": "order_1234567890",
    "totalAmount": 50000,
    "rentalHisId": 1,
    "productId": 12,
    "status": "PENDING"
  },
  "timestamp": "2025-11-06T15:31:14.1643951"
}
```

### 2. 결제 승인 (토스 결제 완료 후)
**POST** `/api/v1/payments/confirm`

**Request Body:**
```json
{
  "orderId": "order_1234567890",
  "paymentId": 1,
  "paymentKey": "payment_key_from_toss",
  "amount": 50000
}
```

**Response (200 OK):**
```json
{
  "status": 200,
  "message": "결제가 승인되었습니다",
  "data": {
    "paymentId": 1,
    "orderId": "order_1234567890",
    "status": "COMPLETED",
    "approvedAt": "2025-11-06T15:31:14.1643951"
  },
  "timestamp": "2025-11-06T15:31:14.1643951"
}
```

### 3. 결제 상세 조회
**GET** `/api/v1/payments/{paymentId}`

**Response (200 OK):**
```json
{
  "status": 200,
  "message": "결제 상세 조회 완료",
  "data": {
    "paymentId": 1,
    "orderId": "order_1234567890",
    "totalAmount": 50000,
    "status": "COMPLETED",
    "rentalHisId": 1,
    "productId": 12,
    "createdAt": "2025-11-06T15:30:00",
    "approvedAt": "2025-11-06T15:31:00"
  },
  "timestamp": "2025-11-06T15:31:14.1643951"
}
```

---

## 인증 방식

### 쿠키 기반 인증
- **Access Token 쿠키명**: `access_token`
- **Refresh Token 쿠키명**: `refresh_token`
- **쿠키 설정**: 백엔드에서 자동으로 설정 (SameSite=Lax, HttpOnly)

### REST API 인증
- 쿠키가 자동으로 전송됨 (`withCredentials: true`)
- 또는 Authorization 헤더 사용 가능: `Bearer {access_token}`

### WebSocket 인증
- 쿠키만 사용 (SockJS가 자동으로 쿠키 전송)
- Authorization 헤더는 사용하지 않음

---

## 프론트엔드 연동 예시

### 1. Axios 설정
```javascript
import axios from 'axios';

export const axiosInstance = axios.create({
  baseURL: '/api/v1', // Vite 프록시 사용
  timeout: 10000,
  withCredentials: true, // 쿠키 자동 전송
  headers: {
    'Content-Type': 'application/json'
  }
});
```

### 2. 채팅방 생성
```javascript
import { axiosInstance } from '@/lib/axios/axiosInstance';

const createChatRoom = async (productId) => {
  const response = await axiosInstance.post('/chat-rooms', {
    productId: Number(productId)
  });
  return response.data.data;
};
```

### 3. WebSocket 연결
```javascript
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

const connectWebSocket = (chatRoomId, onMessage) => {
  const wsUrl = 'http://localhost:8080/ws/chat';
  const socket = new SockJS(wsUrl);
  const client = new Client({
    webSocketFactory: () => socket,
    connectHeaders: {}, // 빈 헤더 - 쿠키 기반 인증
    reconnectDelay: 3000,
    heartbeatIncoming: 25000,
    heartbeatOutgoing: 25000,
    onConnect: (frame) => {
      console.log('WebSocket 연결 성공:', frame);
      
      // 메시지 구독
      client.subscribe(`/topic/chat/${chatRoomId}`, (message) => {
        const data = JSON.parse(message.body);
        onMessage(data);
      });
    },
    onError: (error) => {
      console.error('WebSocket 연결 실패:', error);
    }
  });
  
  client.activate();
  return client;
};
```

### 4. 메시지 전송
```javascript
const sendMessage = (client, chatRoomId, content) => {
  client.publish({
    destination: `/app/chat/${chatRoomId}/send`,
    body: JSON.stringify({
      type: 'TEXT',
      content: content
    })
  });
};
```

### 5. 결제 생성 및 승인
```javascript
import { axiosInstance } from '@/lib/axios/axiosInstance';

// 1. 결제 생성 (OrderId 발급)
const createPayment = async (rentalHisId, productId, totalAmount, orderName) => {
  const response = await axiosInstance.post('/payments', {
    rentalHisId,
    productId,
    totalAmount,
    orderName
  });
  return response.data.data;
};

// 2. 토스 결제 위젯 호출
const requestPayment = async (orderId, amount) => {
  const paymentWidget = window.PaymentWidget(orderId, 'client_key');
  await paymentWidget.requestPayment({
    orderId,
    amount,
    successUrl: 'https://your-domain.com/payment/success',
    failUrl: 'https://your-domain.com/payment/fail'
  });
};

// 3. 결제 승인 (토스 콜백 후)
const confirmPayment = async (orderId, paymentId, paymentKey, amount) => {
  const response = await axiosInstance.post('/payments/confirm', {
    orderId,
    paymentId,
    paymentKey,
    amount
  });
  return response.data.data;
};
```

---

## 환경 변수 설정

### 프론트엔드 `.env.development`
```env
# API Base URL
VITE_API_BASE_URL=/api/v1

# WebSocket URL
VITE_WS_URL=/ws/chat

# 백엔드 프록시 타겟
VITE_BACKEND_TARGET=http://localhost:8080
```

### Vite 프록시 설정 (`vite.config.js`)
```javascript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        withCredentials: true
      },
      '/ws': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        ws: true,
        secure: false
      }
    }
  }
});
```

---

## 에러 처리

### HTTP 상태 코드
- `200`: 성공
- `201`: 생성 성공
- `204`: 성공 (응답 본문 없음)
- `400`: 잘못된 요청
- `401`: 인증 실패 (로그인 필요)
- `403`: 권한 없음
- `404`: 리소스 없음
- `500`: 서버 오류

### 에러 응답 형식
```json
{
  "status": 400,
  "code": "C001",
  "message": "잘못된 입력값입니다",
  "timestamp": "2025-11-06T15:31:14.1643951"
}
```

---

## 참고 자료

- 백엔드 Swagger UI: `http://localhost:8080/swagger-ui.html`
- 백엔드 WebSocket 엔드포인트: `ws://localhost:8080/ws/chat`
- 프론트엔드 기본 URL: `http://localhost:5173`

---

**마지막 업데이트**: 2025-11-06



