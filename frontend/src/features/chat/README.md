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
