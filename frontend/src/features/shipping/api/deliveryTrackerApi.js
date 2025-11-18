/**
 * Delivery Tracker API Client
 * Delivery Tracker GraphQL API를 호출하는 클라이언트
 */

// Vite 환경 변수 접근 (VITE_ 접두사 사용)
const CLIENT_ID = import.meta.env.VITE_TRACKER_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_TRACKER_CLIENT_SECRET;
const API_URL = import.meta.env.VITE_TRACKER_API_URL || 'https://apis.tracker.delivery/graphql';

// 인증 헤더 생성
const getAuthHeader = () => {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Delivery Tracker API 인증 정보가 설정되지 않았습니다. .env 파일에 VITE_TRACKER_CLIENT_ID와 VITE_TRACKER_CLIENT_SECRET을 설정해주세요.');
  }
  return `TRACKQL-API-KEY ${CLIENT_ID}:${CLIENT_SECRET}`;
};

/**
 * 택배사 코드 매핑 (프론트엔드 코드 → Delivery Tracker carrierId)
 */
const COURIER_CODE_MAP = {
  // 영어 코드 매핑
  cj: 'kr.cjlogistics',      // CJ대한통운
  post: 'kr.epost',           // 우체국택배
  lotte: 'kr.lotte',          // 롯데택배
  hanjin: 'kr.hanjin',        // 한진택배
  logen: 'kr.logen',          // 로젠택배
  // 한글 이름 매핑
  'cj대한통운': 'kr.cjlogistics',
  'cj 대한통운': 'kr.cjlogistics',
  '대한통운': 'kr.cjlogistics',
  '우체국택배': 'kr.epost',
  '롯데택배': 'kr.lotte',
  '한진택배': 'kr.hanjin',
  '로젠택배': 'kr.logen',
  // 영어 이름 매핑 (대소문자 무관)
  'cjlogistics': 'kr.cjlogistics',
  'epost': 'kr.epost',
};

/**
 * 프론트엔드 택배사 코드를 Delivery Tracker carrierId로 변환
 * @param {string} courierCode - 프론트엔드 택배사 코드 (cj, post, lotte 등), 한글 이름 (한진택배 등), 또는 carrierId (kr.cjlogistics 등)
 * @returns {string} Delivery Tracker carrierId
 */
export const mapCourierToCarrierId = (courierCode) => {
  if (!courierCode) {
    throw new Error('택배사 코드가 제공되지 않았습니다.');
  }

  // 이미 carrierId 형식인 경우 (kr.xxx) 그대로 반환
  if (courierCode.startsWith('kr.')) {
    return courierCode;
  }
  
  // 소문자 변환하여 매핑 테이블에서 검색
  const normalizedCode = courierCode.trim();
  const carrierId = COURIER_CODE_MAP[normalizedCode.toLowerCase()] || COURIER_CODE_MAP[normalizedCode];
  
  if (!carrierId) {
    throw new Error(`지원하지 않는 택배사 코드입니다: ${courierCode}`);
  }
  return carrierId;
};

/**
 * GraphQL 요청 헬퍼 함수
 * @param {string} query - GraphQL 쿼리
 * @param {Object} variables - 쿼리 변수
 * @returns {Promise<Object>} API 응답
 */
const graphqlRequest = async (query, variables = {}) => {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuthHeader(),
      },
      body: JSON.stringify({
        query: query.trim(),
        variables,
      }),
    });

    const result = await response.json();

    if (!response.ok || result.errors) {
      const errorMessage = result.errors?.[0]?.message || `API 요청 실패: ${response.status}`;
      throw new Error(errorMessage);
    }

    return result.data;
  } catch (error) {
    if (error.message.includes('인증 정보')) {
      throw error;
    }
    throw new Error(`배송 추적 API 호출 중 오류 발생: ${error.message}`);
  }
};

/**
 * 운송장 정보 조회 (Query.track)
 * @param {string} carrierId - Delivery Tracker carrierId (예: 'kr.cjlogistics')
 * @param {string} trackingNumber - 운송장 번호
 * @returns {Promise<Object>} 배송 추적 정보
 */
export const trackPackage = async (carrierId, trackingNumber) => {
  const TRACK_QUERY = `
    query Track($carrierId: ID!, $trackingNumber: String!) {
      track(carrierId: $carrierId, trackingNumber: $trackingNumber) {
        lastEvent {
          time
          status {
            code
            name
          }
          location {
            name
          }
          description
        }
        events(last: 50) {
          edges {
            node {
              time
              status {
                code
                name
              }
              location {
                name
              }
              description
            }
          }
        }
      }
    }
  `;

  const data = await graphqlRequest(TRACK_QUERY, {
    carrierId,
    trackingNumber,
  });

  return data.track;
};

/**
 * 택배사 목록 조회 (Query.carriers) - 선택적
 * @param {number} first - 조회할 택배사 개수 (기본: 50)
 * @param {string} after - 커서 (페이징용)
 * @returns {Promise<Array>} 택배사 목록
 */
export const getCarriers = async (first = 50, after = null) => {
  const CARRIERS_QUERY = `
    query CarrierList($first: Int!, $after: String) {
      carriers(first: $first, after: $after) {
        edges {
          node {
            id
            name
          }
        }
      }
    }
  `;

  const data = await graphqlRequest(CARRIERS_QUERY, { first, after });
  return data.carriers.edges.map(edge => edge.node);
};

/**
 * Delivery Tracker 상태를 프론트엔드 상태로 변환
 * @param {Object} trackData - Delivery Tracker track 응답 데이터
 * @returns {Object} 프론트엔드 배송 상태 객체
 */
export const transformTrackingData = (trackData) => {
  if (!trackData || !trackData.lastEvent) {
    return {
      status: 'PENDING',
      currentLocation: null,
      lastUpdateTime: null,
      history: [],
    };
  }

  const lastEvent = trackData.lastEvent;
  const statusCode = lastEvent.status?.code || '';
  const statusName = lastEvent.status?.name || '';

  // Delivery Tracker 상태 코드를 프론트엔드 상태로 매핑
  const statusMap = {
    'at_pickup': 'COLLECTED',           // 집화 완료
    'in_transit': 'IN_TRANSIT',          // 배송 중
    'out_for_delivery': 'OUT_FOR_DELIVERY', // 배송 출발
    'delivered': 'DELIVERED',            // 배송 완료
    'exception': 'EXCEPTION',           // 배송 예외
  };

  // 상태 코드 매핑 (부분 일치)
  let mappedStatus = 'PENDING';
  for (const [key, value] of Object.entries(statusMap)) {
    if (statusCode.toLowerCase().includes(key) || statusName.toLowerCase().includes(key)) {
      mappedStatus = value;
      break;
    }
  }

  // 배송 히스토리 변환 (events 구조에 맞게 수정)
  const events = trackData.events?.edges || [];
  const history = events.map((edge) => {
    const node = edge.node;
    return {
      status: node.status?.name || 'UNKNOWN',
      location: node.location?.name || null,
      timestamp: node.time ? new Date(node.time).toISOString() : null,
      description: node.description || null,
    };
  });

  return {
    status: mappedStatus,
    currentLocation: lastEvent.location?.name || null,
    lastUpdateTime: lastEvent.time ? new Date(lastEvent.time).toISOString() : null,
    statusName: statusName,
    statusCode: statusCode,
    history: history,
  };
};

