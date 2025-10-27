/**
 * Dummy Data Constants
 * 통일된 더미 데이터 - 3명의 사용자로 간소화
 */

// 사용자 더미 데이터
export const DUMMY_USERS = {
  currentUser: {
    id: 'user_001',
    nickname: '김대여',
    email: 'kim@example.com',
    profileImage: null,
    bio: '안전하고 신뢰할 수 있는 대여 서비스를 제공합니다.',
    isVerified: true,
    rating: 4.8,
    reviewCount: 15
  },
  others: [
    {
      id: 'user_002',
      nickname: '박판매',
      email: 'park@example.com',
      profileImage: null,
      bio: '게임기 전문 렌터입니다. 깨끗한 상태로 관리합니다.',
      isVerified: true,
      rating: 4.9,
      reviewCount: 12
    },
    {
      id: 'user_003',
      nickname: '이렌터',
      email: 'lee@example.com',
      profileImage: null,
      bio: 'IT 기기 전문 렌터입니다. 최신 기기로 업데이트합니다.',
      isVerified: true,
      rating: 4.7,
      reviewCount: 8
    }
  ]
};

// 상품 더미 데이터
export const DUMMY_PRODUCTS = [
  {
    id: 'product_001',
    title: '닌텐도 스위치 OLED',
    description: '최신 OLED 모델로 더욱 선명한 화질을 경험하세요!',
    price: 15000,
    deposit: 100000,
    location: '서울시 강남구',
    images: [
      '/src/assets/images/nintendo-switch.jpg',
      '/src/assets/images/controller-1.jpg',
      '/src/assets/images/controller-2.jpg',
      '/src/assets/images/games.jpg'
    ],
    sellerId: 'user_002',
    seller: DUMMY_USERS.others[0],
    category: '게임기',
    condition: 'excellent',
    isAvailable: true,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-20T15:30:00Z'
  },
  {
    id: 'product_002',
    title: 'MacBook Pro 14인치',
    description: 'M3 Pro 칩셋으로 최고의 성능을 경험하세요',
    price: 50000,
    deposit: 500000,
    location: '서울시 서초구',
    images: [
      '/src/assets/images/macbook-pro.jpg',
      '/src/assets/images/macbook-side.jpg',
      '/src/assets/images/macbook-keyboard.jpg'
    ],
    sellerId: 'user_003',
    seller: DUMMY_USERS.others[1],
    category: '노트북',
    condition: 'good',
    isAvailable: true,
    createdAt: '2024-01-12T11:00:00Z',
    updatedAt: '2024-01-19T16:45:00Z'
  },
  {
    id: 'product_003',
    title: 'Sony WH-1000XM5 헤드폰',
    description: '업계 최고의 노이즈 캔슬링 헤드폰',
    price: 8000,
    deposit: 200000,
    location: '서울시 마포구',
    images: [
      '/src/assets/images/sony-headphone.jpg',
      '/src/assets/images/sony-headphone-side.jpg',
      '/src/assets/images/sony-headphone-case.jpg'
    ],
    sellerId: 'user_002',
    seller: DUMMY_USERS.others[0],
    category: '오디오',
    condition: 'excellent',
    isAvailable: true,
    createdAt: '2024-01-10T09:00:00Z',
    updatedAt: '2024-01-18T14:20:00Z'
  },
  {
    id: 'product_004',
    title: 'iPad Pro 12.9인치',
    description: 'M2 칩셋으로 최고의 태블릿 경험',
    price: 25000,
    deposit: 300000,
    location: '서울시 송파구',
    images: [
      '/src/assets/images/ipad-pro.jpg',
      '/src/assets/images/ipad-pencil.jpg',
      '/src/assets/images/ipad-keyboard.jpg'
    ],
    sellerId: 'user_003',
    seller: DUMMY_USERS.others[1],
    category: '태블릿',
    condition: 'excellent',
    isAvailable: true,
    createdAt: '2024-01-08T14:00:00Z',
    updatedAt: '2024-01-17T10:30:00Z'
  },
  {
    id: 'product_005',
    title: 'PlayStation 5',
    description: '차세대 게임 콘솔의 혁신적인 경험',
    price: 20000,
    deposit: 150000,
    location: '서울시 강남구',
    images: [
      '/src/assets/images/ps5.jpg',
      '/src/assets/images/ps5-controller.jpg',
      '/src/assets/images/ps5-games.jpg'
    ],
    sellerId: 'user_001',
    seller: DUMMY_USERS.currentUser,
    category: '게임기',
    condition: 'excellent',
    isAvailable: true,
    createdAt: '2024-01-05T16:00:00Z',
    updatedAt: '2024-01-16T12:15:00Z'
  }
];

// 리뷰 더미 데이터
export const DUMMY_REVIEWS = [
  {
    id: 'review_001',
    productId: 'product_001',
    product: DUMMY_PRODUCTS[0], // 닌텐도 스위치 OLED
    reviewerId: 'user_001',
    revieweeId: 'user_002',
    reviewer: DUMMY_USERS.currentUser,
    reviewee: DUMMY_USERS.others[0],
    rating: 5,
    content: '정말 좋은 상태로 받았습니다! 게임도 잘 되고 화질도 정말 좋아요.',
    images: ['/src/assets/images/review-1.jpg'],
    createdAt: '2024-01-16T10:30:00Z'
  },
  {
    id: 'review_002',
    productId: 'product_002',
    product: DUMMY_PRODUCTS[1], // MacBook Pro 14인치
    reviewerId: 'user_001',
    revieweeId: 'user_003',
    reviewer: DUMMY_USERS.currentUser,
    reviewee: DUMMY_USERS.others[1],
    rating: 4,
    content: '개발 작업에 정말 최적화되어 있네요. 배터리도 오래 가고 성능도 훌륭합니다.',
    images: ['/src/assets/images/review-2.jpg'],
    createdAt: '2024-01-11T09:15:00Z'
  },
  {
    id: 'review_003',
    productId: 'product_005',
    product: DUMMY_PRODUCTS[4], // PlayStation 5
    reviewerId: 'user_002',
    revieweeId: 'user_001',
    reviewer: DUMMY_USERS.others[0],
    reviewee: DUMMY_USERS.currentUser,
    rating: 5,
    content: '매우 신뢰할 수 있는 분이었습니다. 상품도 잘 관리해주시고 소통도 원활했습니다.',
    images: [],
    createdAt: '2024-01-13T14:20:00Z'
  },
  {
    id: 'review_004',
    productId: 'product_003',
    product: DUMMY_PRODUCTS[2], // Sony WH-1000XM5 헤드폰
    reviewerId: 'user_003',
    revieweeId: 'user_002',
    reviewer: DUMMY_USERS.others[1],
    reviewee: DUMMY_USERS.others[0],
    rating: 4,
    content: '헤드폰 상태는 좋았지만 약간 늦게 배송되었습니다.',
    images: [],
    createdAt: '2024-01-12T11:15:00Z'
  },
  {
    id: 'review_005',
    productId: 'product_004',
    product: DUMMY_PRODUCTS[3], // iPad Pro 12.9인치
    reviewerId: 'user_001',
    revieweeId: 'user_003',
    reviewer: DUMMY_USERS.currentUser,
    reviewee: DUMMY_USERS.others[1],
    rating: 5,
    content: '아이패드로 작업하기 정말 편리했습니다. 펜슬도 잘 작동하고요.',
    images: [],
    createdAt: '2024-01-09T15:45:00Z'
  }
];

// 채팅방 더미 데이터 - 실제 사용자들만 포함
export const DUMMY_CHAT_ROOMS = [
  {
    id: 'chat_001',
    name: '박판매',
    participants: [
      { id: DUMMY_USERS.currentUser.id, profileImage: DUMMY_USERS.currentUser.profileImage },
      { id: DUMMY_USERS.others[0].id, profileImage: DUMMY_USERS.others[0].profileImage }
    ],
    lastMessage: {
      content: '네, 내일 오후에 가능합니다!',
      sender: DUMMY_USERS.others[0],
      timestamp: '2024-01-20T15:30:00Z'
    },
    unreadCount: 2,
    isPinned: false,
    isMuted: false,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-20T15:30:00Z'
  },
  {
    id: 'chat_002',
    name: '이렌터',
    participants: [
      { id: DUMMY_USERS.currentUser.id, profileImage: DUMMY_USERS.currentUser.profileImage },
      { id: DUMMY_USERS.others[1].id, profileImage: DUMMY_USERS.others[1].profileImage }
    ],
    lastMessage: {
      content: 'MacBook 상태 확인해주세요',
      sender: DUMMY_USERS.currentUser,
      timestamp: '2024-01-19T16:45:00Z'
    },
    unreadCount: 0,
    isPinned: true,
    isMuted: false,
    createdAt: '2024-01-12T11:00:00Z',
    updatedAt: '2024-01-19T16:45:00Z'
  }
];

// 메시지 더미 데이터 - 실제 상품 관련 대화
export const DUMMY_MESSAGES = {
  chat_001: [
    {
      id: 'msg_001',
      content: '안녕하세요! 닌텐도 스위치 OLED 대여 가능한가요?',
      sender: DUMMY_USERS.currentUser,
      timestamp: '2024-01-15T10:00:00Z',
      type: 'text'
    },
    {
      id: 'msg_002',
      content: '네, 가능합니다! 언제 필요하신가요?',
      sender: DUMMY_USERS.others[0],
      timestamp: '2024-01-15T10:05:00Z',
      type: 'text'
    },
    {
      id: 'msg_003',
      content: '내일 오후에 가능한가요?',
      sender: DUMMY_USERS.currentUser,
      timestamp: '2024-01-15T10:10:00Z',
      type: 'text'
    },
    {
      id: 'msg_004',
      content: '네, 내일 오후에 가능합니다!',
      sender: DUMMY_USERS.others[0],
      timestamp: '2024-01-20T15:30:00Z',
      type: 'text'
    }
  ],
  chat_002: [
    {
      id: 'msg_005',
      content: 'MacBook Pro 14인치 대여 문의드립니다',
      sender: DUMMY_USERS.currentUser,
      timestamp: '2024-01-12T11:00:00Z',
      type: 'text'
    },
    {
      id: 'msg_006',
      content: '네, 언제 필요하신가요?',
      sender: DUMMY_USERS.others[1],
      timestamp: '2024-01-12T11:05:00Z',
      type: 'text'
    },
    {
      id: 'msg_007',
      content: 'MacBook 상태 확인해주세요',
      sender: DUMMY_USERS.currentUser,
      timestamp: '2024-01-19T16:45:00Z',
      type: 'text'
    }
  ]
};