# Chat Feature

채팅 관련 기능을 담당하는 feature입니다.

## 📋 책임 범위

- 채팅방 CRUD (생성, 조회, 수정, 삭제)
- 실시간 메시지 송수신
- 웹소켓 연결 관리
- 시스템 메시지 처리
- 대여 요청/승인/거절

## 🏗️ 구조

```
chat/
├── api/
│   ├── chatApi.js          # 채팅방 API
│   ├── messageApi.js       # 메시지 API
│   └── websocketApi.js     # 웹소켓 API
├── components/
│   ├── ChatRoomListItem.jsx # 채팅방 목록 아이템
│   ├── MessageBubble.jsx    # 메시지 버블
│   ├── MessageInput.jsx     # 메시지 입력
│   └── SystemMessageBadge.jsx # 시스템 메시지
├── hooks/
│   ├── useChatRooms.js     # 채팅방 목록 훅
│   ├── useMessages.js      # 메시지 훅
│   ├── useChatSocket.js    # 웹소켓 훅
│   └── useRentalRequest.js  # 대여 요청 훅
├── contexts/
│   └── ChatContext.jsx     # 채팅 컨텍스트
├── pages/
│   ├── ChatListPage.jsx    # 채팅방 목록 페이지
│   └── ChatRoomPage.jsx    # 채팅방 페이지
└── index.js                # Barrel Export
```

## 🔧 주요 기능

### ChatContext
- 전역 채팅 상태 관리
- 현재 채팅방 정보
- 메시지 목록 관리
- 웹소켓 연결 상태

### useChatSocket 훅
- 웹소켓 연결/해제
- 메시지 송수신
- 연결 상태 관리

### useMessages 훅
- 메시지 목록 조회
- 메시지 전송/수정/삭제
- 실시간 메시지 업데이트

## 📝 사용 예시

```jsx
import { ChatProvider, useChatContext, ChatRoomPage } from '@/features/chat';

function ChatApp() {
  return (
    <ChatProvider>
      <ChatRoomPage />
    </ChatProvider>
  );
}

function ChatRoom() {
  const { messages, sendMessage, isConnected } = useChatContext();

  const handleSendMessage = (content) => {
    sendMessage({ content });
  };

  return (
    <div>
      <div className="messages">
        {messages.map(message => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </div>
      <MessageInput onSendMessage={handleSendMessage} />
    </div>
  );
}
```

## 🔗 API 엔드포인트

- `GET /chats` - 채팅방 목록 조회
- `POST /chats` - 채팅방 생성
- `GET /chats/:id` - 채팅방 상세 조회
- `PUT /chats/:id` - 채팅방 수정
- `DELETE /chats/:id` - 채팅방 삭제
- `GET /chats/:id/messages` - 메시지 목록 조회
- `POST /chats/:id/messages` - 메시지 전송
- `PUT /messages/:id` - 메시지 수정
- `DELETE /messages/:id` - 메시지 삭제

## 🌐 웹소켓

- 연결: `ws://localhost:8080/chats/:chatRoomId`
- 메시지 형식: JSON
- 자동 재연결 지원
- 연결 상태 모니터링

### 웹소켓 이벤트
```javascript
// 클라이언트 → 서버
socket.emit('join_room', chatRoomId);
socket.emit('leave_room', chatRoomId);
socket.emit('send_message', { chatId, content, type });
socket.emit('typing_start', chatRoomId);
socket.emit('typing_stop', chatRoomId);

// 서버 → 클라이언트
socket.on('message_received', (message) => {});
socket.on('user_joined', (user) => {});
socket.on('user_left', (user) => {});
socket.on('typing_start', (user) => {});
socket.on('typing_stop', (user) => {});
```

## 💬 메시지 타입

### 일반 메시지
- `text`: 텍스트 메시지
- `image`: 이미지 메시지
- `file`: 파일 메시지

### 시스템 메시지
- `rental_request`: 대여 요청
- `rental_accepted`: 대여 승인
- `rental_rejected`: 대여 거절
- `payment_completed`: 결제 완료
- `shipping_started`: 배송 시작
- `transaction_completed`: 거래 완료

### FSM 연동 메시지
```javascript
const systemMessages = {
  PENDING_ACCEPTANCE: '대여 요청이 전송되었습니다',
  DEPOSIT_PENDING: '보증금 결제를 진행해주세요',
  RENTAL_FEE_PENDING: '대여료 결제를 진행해주세요',
  AWAITING_OUTBOUND_SHIPPING: '물건을 발송해주세요',
  OUTBOUND_SHIPPING_IN_PROGRESS: '배송이 시작되었습니다',
  AWAITING_DELIVERY_CONFIRMATION: '수령 확인 및 개봉 영상을 촬영해주세요',
  IN_USE: '대여가 시작되었습니다',
  AWAITING_RETURN_SHIPPING: '물건을 반납해주세요',
  RETURN_SHIPPING_IN_PROGRESS: '반납 배송이 시작되었습니다',
  AWAITING_RETURN_CONFIRMATION: '반납 확인 및 개봉 영상을 촬영해주세요',
  COMPLETED: '거래가 완료되었습니다',
  DISPUTED: '분쟁이 접수되었습니다'
};
```

## 🔗 거래 패널 연동

채팅방에는 FSM 상태에 따른 거래 패널이 표시됩니다:

```jsx
// features/chat/pages/ChatRoomPage.jsx
import { TransactionPanel } from '@/shared/components';

const ChatRoomPage = () => {
  const { transaction } = useTransaction(transactionId);
  const userRole = getUserRole(transaction, currentUser);

  return (
    <div className="chat-room">
      <MessageList messages={messages} />
      
      {transaction && (
        <TransactionPanel
          transaction={transaction}
          userRole={userRole}
          onAction={handleTransactionAction}
        />
      )}
      
      <MessageInput onSend={handleSendMessage} />
    </div>
  );
};
```

## 🚀 개발 예정 사항

### Phase 1: 기본 채팅
- [x] 실시간 메시지 송수신
- [x] 채팅방 생성 및 관리
- [x] 웹소켓 연결 관리
- [x] 시스템 메시지 처리

### Phase 2: 고급 기능
- [ ] 메시지 검색
- [ ] 파일 업로드/다운로드
- [ ] 이미지 미리보기
- [ ] 메시지 읽음 표시
- [ ] 타이핑 인디케이터

### Phase 3: 거래 통합
- [ ] 거래 상태별 액션 버튼
- [ ] 자동 시스템 메시지 생성
- [ ] 거래 히스토리 연동
- [ ] 분쟁 신고 기능

### Phase 4: 최적화
- [ ] 메시지 가상화 (무한 스크롤)
- [ ] 오프라인 메시지 동기화
- [ ] 푸시 알림 연동
- [ ] 메시지 암호화

## 📱 모바일 최적화

### 터치 인터랙션
- 스와이프로 메시지 답장
- 길게 눌러서 메시지 옵션
- 키보드 높이 자동 조절

### 성능 최적화
- 메시지 가상화로 메모리 사용량 최적화
- 이미지 지연 로딩
- 백그라운드에서 연결 유지

이 feature를 통해 실시간 소통과 안전한 거래를 지원합니다.