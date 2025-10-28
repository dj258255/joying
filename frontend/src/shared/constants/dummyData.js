/**
 * Dummy Data Constants
 * 통일된 더미 데이터 - 3명의 사용자로 간소화
 */

// 사용자 더미 데이터
export const DUMMY_USERS = {
  currentUser: {
    userId: 101,
    email: 'kim@example.com',
    username: '김대여',
    gender: 'male',
    birth: '1995-05-20',
    profileImageUrl: null,
    createdAt: '2024-01-01T10:00:00Z',
    bio: '안전하고 신뢰할 수 있는 대여 서비스를 제공합니다.',
    isVerified: true,
    rating: 4.8,
    reviewCount: 15
  },
  others: [
    {
      userId: 102,
      email: 'park@example.com',
      username: '박판매',
      gender: 'female',
      birth: '1992-08-15',
      profileImageUrl: null,
      createdAt: '2024-01-02T11:00:00Z',
      bio: '게임기 전문 렌터입니다. 깨끗한 상태로 관리합니다.',
      isVerified: true,
      rating: 3.7,
      reviewCount: 12
    },
    {
      userId: 103,
      email: 'lee@example.com',
      username: '이렌터',
      gender: 'male',
      birth: '1998-12-03',
      profileImageUrl: null,
      createdAt: '2024-01-03T12:00:00Z',
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
    sellerId: 102,
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
    sellerId: 103,
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
    sellerId: 102,
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
    sellerId: 103,
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
    sellerId: 101,
    seller: DUMMY_USERS.currentUser,
    category: '게임기',
    condition: 'excellent',
    isAvailable: true,
    createdAt: '2024-01-05T16:00:00Z',
    updatedAt: '2024-01-16T12:15:00Z'
  },
  // 김대여(user_001) 추가 상품들
  {
    id: 'product_006',
    title: 'iPhone 15 Pro',
    description: '최신 A17 Pro 칩셋과 티타늄 디자인',
    price: 30000,
    deposit: 400000,
    location: '서울시 강남구',
    images: [
      '/src/assets/images/iphone15-pro.jpg',
      '/src/assets/images/iphone15-pro-back.jpg',
      '/src/assets/images/iphone15-pro-case.jpg'
    ],
    sellerId: 101,
    seller: DUMMY_USERS.currentUser,
    category: '스마트폰',
    condition: 'excellent',
    isAvailable: true,
    createdAt: '2024-01-03T13:00:00Z',
    updatedAt: '2024-01-15T09:30:00Z'
  },
  {
    id: 'product_007',
    title: 'AirPods Pro 2세대',
    description: 'USB-C 포트와 향상된 노이즈 캔슬링',
    price: 5000,
    deposit: 150000,
    location: '서울시 강남구',
    images: [
      '/src/assets/images/airpods-pro2.jpg',
      '/src/assets/images/airpods-pro2-case.jpg',
      '/src/assets/images/airpods-pro2-ear.jpg'
    ],
    sellerId: 101,
    seller: DUMMY_USERS.currentUser,
    category: '오디오',
    condition: 'excellent',
    isAvailable: true,
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-14T16:45:00Z'
  },
  {
    id: 'product_008',
    title: 'Nintendo Switch Lite',
    description: '휴대용 게임기로 언제 어디서나 게임을 즐기세요',
    price: 8000,
    deposit: 80000,
    location: '서울시 강남구',
    images: [
      '/src/assets/images/switch-lite.jpg',
      '/src/assets/images/switch-lite-side.jpg',
      '/src/assets/images/switch-lite-games.jpg'
    ],
    sellerId: 101,
    seller: DUMMY_USERS.currentUser,
    category: '게임기',
    condition: 'good',
    isAvailable: true,
    createdAt: '2023-12-28T15:30:00Z',
    updatedAt: '2024-01-13T11:20:00Z'
  },
  // 박판매(user_002) 추가 상품들
  {
    id: 'product_009',
    title: 'Xbox Series X',
    description: '마이크로소프트의 차세대 게임 콘솔',
    price: 18000,
    deposit: 140000,
    location: '서울시 서초구',
    images: [
      '/src/assets/images/xbox-series-x.jpg',
      '/src/assets/images/xbox-controller.jpg',
      '/src/assets/images/xbox-games.jpg'
    ],
    sellerId: 102,
    seller: DUMMY_USERS.others[0],
    category: '게임기',
    condition: 'excellent',
    isAvailable: true,
    createdAt: '2024-01-07T12:00:00Z',
    updatedAt: '2024-01-17T14:15:00Z'
  },
  {
    id: 'product_010',
    title: 'Samsung Galaxy Buds2 Pro',
    description: '삼성의 프리미엄 무선 이어폰',
    price: 6000,
    deposit: 120000,
    location: '서울시 서초구',
    images: [
      '/src/assets/images/galaxy-buds2-pro.jpg',
      '/src/assets/images/galaxy-buds2-pro-case.jpg',
      '/src/assets/images/galaxy-buds2-pro-ear.jpg'
    ],
    sellerId: 102,
    seller: DUMMY_USERS.others[0],
    category: '오디오',
    condition: 'excellent',
    isAvailable: true,
    createdAt: '2024-01-04T09:30:00Z',
    updatedAt: '2024-01-16T13:40:00Z'
  },
  {
    id: 'product_011',
    title: 'Steam Deck',
    description: '휴대용 PC 게임기로 어디서나 스팀 게임을 즐기세요',
    price: 25000,
    deposit: 200000,
    location: '서울시 서초구',
    images: [
      '/src/assets/images/steam-deck.jpg',
      '/src/assets/images/steam-deck-back.jpg',
      '/src/assets/images/steam-deck-games.jpg'
    ],
    sellerId: 102,
    seller: DUMMY_USERS.others[0],
    category: '게임기',
    condition: 'good',
    isAvailable: true,
    createdAt: '2023-12-30T11:15:00Z',
    updatedAt: '2024-01-15T10:25:00Z'
  },
  // 이렌터(user_003) 추가 상품들
  {
    id: 'product_012',
    title: 'Surface Pro 9',
    description: '마이크로소프트의 최신 태블릿 PC',
    price: 35000,
    deposit: 350000,
    location: '서울시 송파구',
    images: [
      '/src/assets/images/surface-pro9.jpg',
      '/src/assets/images/surface-pro9-keyboard.jpg',
      '/src/assets/images/surface-pro9-pen.jpg'
    ],
    sellerId: 103,
    seller: DUMMY_USERS.others[1],
    category: '태블릿',
    condition: 'excellent',
    isAvailable: true,
    createdAt: '2024-01-06T14:45:00Z',
    updatedAt: '2024-01-18T12:30:00Z'
  },
  {
    id: 'product_013',
    title: 'Dell XPS 13',
    description: '인피니티 엣지 디스플레이의 프리미엄 노트북',
    price: 40000,
    deposit: 450000,
    location: '서울시 송파구',
    images: [
      '/src/assets/images/dell-xps13.jpg',
      '/src/assets/images/dell-xps13-keyboard.jpg',
      '/src/assets/images/dell-xps13-side.jpg'
    ],
    sellerId: 103,
    seller: DUMMY_USERS.others[1],
    category: '노트북',
    condition: 'excellent',
    isAvailable: true,
    createdAt: '2024-01-02T16:20:00Z',
    updatedAt: '2024-01-17T15:10:00Z'
  },
  {
    id: 'product_014',
    title: 'Apple Watch Series 9',
    description: '최신 S9 칩셋과 향상된 건강 기능',
    price: 12000,
    deposit: 180000,
    location: '서울시 송파구',
    images: [
      '/src/assets/images/apple-watch-series9.jpg',
      '/src/assets/images/apple-watch-band.jpg',
      '/src/assets/images/apple-watch-charger.jpg'
    ],
    sellerId: 103,
    seller: DUMMY_USERS.others[1],
    category: '스마트워치',
    condition: 'excellent',
    isAvailable: true,
    createdAt: '2023-12-25T08:00:00Z',
    updatedAt: '2024-01-14T17:50:00Z'
  }
];

// 리뷰 더미 데이터
export const DUMMY_REVIEWS = [
  {
    id: 'review_001',
    productId: 'product_001',
    product: DUMMY_PRODUCTS[0], // 닌텐도 스위치 OLED
    reviewerId: 101,
    revieweeId: 102,
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
    reviewerId: 101,
    revieweeId: 103,
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
    reviewerId: 102,
    revieweeId: 101,
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
    reviewerId: 103,
    revieweeId: 102,
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
    reviewerId: 101,
    revieweeId: 103,
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
      { id: 101, profileImage: null },
      { id: 102, profileImage: null }
    ],
    lastMessage: {
      content: '네, 내일 오후에 가능합니다!',
      sender: { id: 102 },
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
      { id: 101, profileImage: null },
      { id: 103, profileImage: null }
    ],
    lastMessage: {
      content: 'MacBook 상태 확인해주세요',
      sender: { id: 101 },
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
      sender: { id: 101 },
      timestamp: '2024-01-15T10:00:00Z',
      type: 'text'
    },
    {
      id: 'msg_002',
      content: '네, 가능합니다! 언제 필요하신가요?',
      sender: { id: 102 },
      timestamp: '2024-01-15T10:05:00Z',
      type: 'text'
    },
    {
      id: 'msg_003',
      content: '내일 오후에 가능한가요?',
      sender: { id: 101 },
      timestamp: '2024-01-15T10:10:00Z',
      type: 'text'
    },
    {
      id: 'msg_004',
      content: '네, 내일 오후에 가능합니다!',
      sender: { id: 102 },
      timestamp: '2024-01-20T15:30:00Z',
      type: 'text'
    }
  ],
  chat_002: [
    {
      id: 'msg_005',
      content: 'MacBook Pro 14인치 대여 문의드립니다',
      sender: { id: 101 },
      timestamp: '2024-01-12T11:00:00Z',
      type: 'text'
    },
    {
      id: 'msg_006',
      content: '네, 언제 필요하신가요?',
      sender: { id: 103 },
      timestamp: '2024-01-12T11:05:00Z',
      type: 'text'
    },
    {
      id: 'msg_007',
      content: 'MacBook 상태 확인해주세요',
      sender: { id: 101 },
      timestamp: '2024-01-19T16:45:00Z',
      type: 'text'
    }
  ]
};

// 대여 예약 더미 데이터
export const DUMMY_RESERVATIONS = [
  {
    id: 'reservation_001',
    productId: 'product_001',
    product: DUMMY_PRODUCTS[0], // 닌텐도 스위치 OLED
    renterId: 101,
    renter: DUMMY_USERS.currentUser,
    ownerId: 102,
    owner: DUMMY_USERS.others[0],
    startDate: '2024-01-25',
    endDate: '2024-01-27',
    status: 'confirmed',
    createdAt: '2024-01-20T10:00:00Z'
  },
  {
    id: 'reservation_002',
    productId: 'product_002',
    product: DUMMY_PRODUCTS[1], // MacBook Pro 14인치
    renterId: 103,
    renter: DUMMY_USERS.others[1],
    ownerId: 102,
    owner: DUMMY_USERS.others[0],
    startDate: '2024-01-28',
    endDate: '2024-01-30',
    status: 'confirmed',
    createdAt: '2024-01-22T14:30:00Z'
  },
  {
    id: 'reservation_003',
    productId: 'product_001',
    product: DUMMY_PRODUCTS[0], // 닌텐도 스위치 OLED
    renterId: 101,
    renter: DUMMY_USERS.currentUser,
    ownerId: 102,
    owner: DUMMY_USERS.others[0],
    startDate: '2024-02-05',
    endDate: '2024-02-07',
    status: 'pending',
    createdAt: '2024-01-25T09:15:00Z'
  },

];

// 대여 내역 더미 데이터 (빌린 내역, 빌려준 내역)
export const DUMMY_RENTAL_HISTORY = {
  // 내가 빌린 내역
  borrowed: [
    {
      id: 'rental_001',
      productId: 'product_001',
      product: DUMMY_PRODUCTS[0], // 닌텐도 스위치 OLED
      ownerId: 102,
      owner: DUMMY_USERS.others[0],
      startDate: '2024-01-25',
      endDate: '2024-01-27',
      status: 'completed',
      totalPrice: 15000,
      createdAt: '2024-01-20T10:00:00Z',
      completedAt: '2024-01-27T18:00:00Z',
      review: DUMMY_REVIEWS.find(r => r.productId === 'product_001' && r.reviewerId === 101)
    },
    {
      id: 'rental_002',
      productId: 'product_003',
      product: DUMMY_PRODUCTS[2], // 아이패드 프로 12.9인치
      ownerId: 103,
      owner: DUMMY_USERS.others[1],
      startDate: '2024-01-15',
      endDate: '2024-01-17',
      status: 'completed',
      totalPrice: 20000,
      createdAt: '2024-01-10T14:30:00Z',
      completedAt: '2024-01-17T16:00:00Z',
      review: DUMMY_REVIEWS.find(r => r.productId === 'product_003' && r.reviewerId === 101)
    },
    {
      id: 'rental_003',
      productId: 'product_001',
      product: DUMMY_PRODUCTS[0], // 닌텐도 스위치 OLED
      ownerId: 102,
      owner: DUMMY_USERS.others[0],
      startDate: '2024-02-05',
      endDate: '2024-02-07',
      status: 'pending',
      totalPrice: 15000,
      createdAt: '2024-01-25T09:15:00Z',
      completedAt: null,
      review: null
    }
  ],
  // 내가 빌려준 내역
  lent: [
    {
      id: 'rental_004',
      productId: 'product_004',
      product: DUMMY_PRODUCTS[3], // 캐논 EOS R5 카메라
      renterId: 102,
      renter: DUMMY_USERS.others[0],
      startDate: '2024-01-20',
      endDate: '2024-01-22',
      status: 'completed',
      totalPrice: 30000,
      createdAt: '2024-01-15T11:00:00Z',
      completedAt: '2024-01-22T17:00:00Z',
      review: DUMMY_REVIEWS.find(r => r.productId === 'product_004' && r.revieweeId === 101)
    },
    {
      id: 'rental_005',
      productId: 'product_005',
      product: DUMMY_PRODUCTS[4], // 소니 WH-1000XM4 헤드폰
      renterId: 103,
      renter: DUMMY_USERS.others[1],
      startDate: '2024-01-30',
      endDate: '2024-02-01',
      status: 'completed',
      totalPrice: 10000,
      createdAt: '2024-01-25T16:20:00Z',
      completedAt: '2024-02-01T14:00:00Z',
      review: DUMMY_REVIEWS.find(r => r.productId === 'product_005' && r.revieweeId === 101)
    },
    {
      id: 'rental_006',
      productId: 'product_006',
      product: DUMMY_PRODUCTS[5], // 삼성 갤럭시 탭 S8
      renterId: 102,
      renter: DUMMY_USERS.others[0],
      startDate: '2024-02-10',
      endDate: '2024-02-12',
      status: 'pending',
      totalPrice: 18000,
      createdAt: '2024-02-05T13:45:00Z',
      completedAt: null,
      review: null
    }
  ]
};