/**
 * Error Messages Constants
 * 에러 메시지 상수들
 */

export const ERROR_MESSAGES = {
  // Common
  NETWORK_ERROR: '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  SERVER_ERROR: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  UNKNOWN_ERROR: '알 수 없는 오류가 발생했습니다.',

  // Auth
  LOGIN_FAILED: '로그인에 실패했습니다. 아이디와 비밀번호를 확인해주세요.',
  LOGOUT_FAILED: '로그아웃에 실패했습니다.',
  TOKEN_EXPIRED: '세션이 만료되었습니다. 다시 로그인해주세요.',
  UNAUTHORIZED: '인증이 필요합니다.',

  // User
  USER_NOT_FOUND: '사용자를 찾을 수 없습니다.',
  PROFILE_UPDATE_FAILED: '프로필 수정에 실패했습니다.',
  ACCOUNT_VERIFY_FAILED: '계좌 인증에 실패했습니다.',

  // Product
  PRODUCT_NOT_FOUND: '상품을 찾을 수 없습니다.',
  PRODUCT_CREATE_FAILED: '상품 등록에 실패했습니다.',
  PRODUCT_UPDATE_FAILED: '상품 수정에 실패했습니다.',
  PRODUCT_DELETE_FAILED: '상품 삭제에 실패했습니다.',
  LIKE_FAILED: '찜하기에 실패했습니다.',

  // Chat
  CHAT_ROOM_NOT_FOUND: '채팅방을 찾을 수 없습니다.',
  MESSAGE_SEND_FAILED: '메시지 전송에 실패했습니다.',
  CHAT_CONNECTION_FAILED: '채팅 연결에 실패했습니다.',

  // Payment
  PAYMENT_FAILED: '결제에 실패했습니다.',
  PAYMENT_CANCEL_FAILED: '결제 취소에 실패했습니다.',
  PAYMENT_REFUND_FAILED: '환불에 실패했습니다.',

  // Review
  REVIEW_CREATE_FAILED: '리뷰 작성에 실패했습니다.',
  REVIEW_UPDATE_FAILED: '리뷰 수정에 실패했습니다.',
  REVIEW_DELETE_FAILED: '리뷰 삭제에 실패했습니다.',

  // Search
  SEARCH_FAILED: '검색에 실패했습니다.',

  // Validation
  INVALID_EMAIL: '올바른 이메일 형식이 아닙니다.',
  INVALID_PHONE: '올바른 전화번호 형식이 아닙니다.',
  INVALID_PASSWORD: '비밀번호는 8자 이상, 영문 대소문자, 숫자, 특수문자를 포함해야 합니다.',
  REQUIRED_FIELD: '필수 입력 항목입니다.',
  PASSWORD_MISMATCH: '비밀번호가 일치하지 않습니다.',

  // File Upload
  FILE_TOO_LARGE: '파일 크기가 너무 큽니다.',
  INVALID_FILE_TYPE: '지원하지 않는 파일 형식입니다.',
  UPLOAD_FAILED: '파일 업로드에 실패했습니다.'
};
