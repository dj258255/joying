import { http, HttpResponse } from 'msw';

const BASE_URL = 'http://localhost:3000/api/v1';

export const handlers = [
  // Auth - 현재 사용자 조회
  http.get(`${BASE_URL}/auth/me`, () => {
    return HttpResponse.json({
      id: 'user123',
      email: 'test@example.com',
      nickname: '테스트유저',
      profileImage: 'https://via.placeholder.com/150',
      createdAt: '2025-01-01T00:00:00Z'
    });
  }),

  // Auth - 카카오 로그인
  http.post(`${BASE_URL}/oauth2/authorization/kakao`, () => {
    return HttpResponse.json({
      accessToken: 'mock_access_token_123',
      refreshToken: 'mock_refresh_token_456'
    });
  }),

  // Product - 상품 조회
  http.get(`${BASE_URL}/product/:productId`, ({ params }) => {
    const { productId } = params;
    return HttpResponse.json({
      id: productId,
      name: '소니 A7M4',
      description: '풀프레임 미러리스 카메라',
      pricePerDay: 30000,
      deposit: 100000,
      images: [
        'https://via.placeholder.com/400',
        'https://via.placeholder.com/400'
      ],
      categoryId: 1,
      categoryName: '카메라',
      ownerId: 'user456',
      ownerName: '판매자',
      rating: 4.8,
      reviewCount: 24,
      createdAt: '2025-01-01T00:00:00Z'
    });
  }),

  // Product - 상품 등록
  http.post(`${BASE_URL}/product`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      id: 'product' + Date.now(),
      ...body,
      createdAt: new Date().toISOString()
    }, { status: 201 });
  }),

  // Chat - 채팅방 목록
  http.get(`${BASE_URL}/chat-rooms`, ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page')) || 1;
    const size = Number(url.searchParams.get('size')) || 20;

    return HttpResponse.json({
      items: [
        {
          id: 'room1',
          type: 'direct',
          participants: [
            { id: 'user123', nickname: '나' },
            { id: 'user456', nickname: '상대방' }
          ],
          lastMessage: {
            content: '안녕하세요!',
            createdAt: '2025-01-15T12:00:00Z'
          },
          unreadCount: 3,
          isPinned: false,
          isMuted: false,
          createdAt: '2025-01-01T00:00:00Z'
        }
      ],
      page,
      size,
      total: 1,
      totalPages: 1
    });
  }),

  // Chat - 메시지 목록
  http.get(`${BASE_URL}/chat-rooms/:chatRoomId/messages`, ({ params }) => {
    return HttpResponse.json({
      messages: [
        {
          id: 'msg1',
          senderId: 'user456',
          senderName: '상대방',
          content: '안녕하세요!',
          type: 'text',
          isRead: true,
          replyTo: null,
          createdAt: '2025-01-15T12:00:00Z'
        },
        {
          id: 'msg2',
          senderId: 'user123',
          senderName: '나',
          content: '네 안녕하세요',
          type: 'text',
          isRead: false,
          replyTo: 'msg1',
          createdAt: '2025-01-15T12:01:00Z'
        }
      ],
      hasNext: false
    });
  }),

  // Payment - 결제 금액 조회
  http.get(`${BASE_URL}/payment/quote`, ({ request }) => {
    const url = new URL(request.url);
    const rentalId = url.searchParams.get('rentalId');

    return HttpResponse.json({
      rentalId,
      amount: 60000,
      deposit: 100000,
      total: 160000,
      days: 2,
      pricePerDay: 30000
    });
  }),

  // Review - 게시글 리뷰 목록
  http.get(`${BASE_URL}/review/rental/:rentalId`, ({ params }) => {
    return HttpResponse.json({
      items: [
        {
          id: 'review1',
          rentalId: params.rentalId,
          writerId: 'user456',
          writerName: '작성자',
          rating: 5,
          content: '깨끗하고 좋아요!',
          type: 'borrower',
          createdAt: '2025-01-10T00:00:00Z'
        }
      ],
      total: 1,
      page: 1
    });
  }),

  // Search - 검색
  http.get(`${BASE_URL}/search`, ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q');

    return HttpResponse.json({
      items: [
        {
          id: 'product1',
          name: `${query} 검색 결과`,
          pricePerDay: 25000,
          images: ['https://via.placeholder.com/200'],
          rating: 4.5,
          reviewCount: 10
        }
      ],
      total: 1,
      page: 1
    });
  }),

  // MyPage - 대여 내역
  http.get(`${BASE_URL}/mypage/borrowed/history`, () => {
    return HttpResponse.json({
      items: [
        {
          id: 'rental1',
          productId: 'product1',
          productName: '소니 A7M4',
          productImage: 'https://via.placeholder.com/200',
          startDate: '2025-01-10',
          endDate: '2025-01-12',
          totalAmount: 60000,
          status: 'completed',
          lenderId: 'user456',
          lenderName: '대여자',
          createdAt: '2025-01-05T00:00:00Z'
        }
      ],
      total: 1,
      page: 1
    });
  }),

  // MyPage - 등록 상품
  http.get(`${BASE_URL}/mypage/items`, () => {
    return HttpResponse.json({
      items: [
        {
          id: 'product1',
          name: '내가 등록한 상품',
          pricePerDay: 30000,
          images: ['https://via.placeholder.com/200'],
          status: 'available',
          createdAt: '2025-01-01T00:00:00Z'
        }
      ],
      total: 1,
      page: 1
    });
  }),

  // MyPage - 찜한 상품
  http.get(`${BASE_URL}/mypage/likes`, () => {
    return HttpResponse.json({
      items: [
        {
          id: 'product2',
          name: '찜한 상품',
          pricePerDay: 25000,
          images: ['https://via.placeholder.com/200'],
          ownerName: '판매자',
          createdAt: '2025-01-01T00:00:00Z'
        }
      ],
      total: 1,
      page: 1
    });
  })
];
