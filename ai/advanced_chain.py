"""
고급 AI 체인: 이미지 분석 → 상품명 추출 → 유사 상품 검색 → 가격 추천 → 최종 설명 생성
하이브리드 카테고리 분류: 룰 베이스 (빠른 경로) + AI (느린 경로)
"""
import json
import logging
from typing import Dict, Any, List, Optional
import httpx
from langchain.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain.schema.runnable import RunnablePassthrough, RunnableLambda
from langchain.schema.output_parser import StrOutputParser

from config import settings
from category_matcher import match_category_by_keywords, get_category_confidence

logger = logging.getLogger(__name__)


class AdvancedProductChain:
    """고급 상품 분석 체인 (AI 기반 가격 추천)"""

    def __init__(self):
        # LangChain OpenAI 클라이언트 (GMS API 사용)
        self.llm = ChatOpenAI(
            model=settings.AI_MODEL,
            temperature=settings.TEMPERATURE,
            max_tokens=settings.MAX_TOKENS,
            openai_api_key=settings.GMS_API_KEY,
            openai_api_base="https://gms.ssafy.io/gmsapi/api.openai.com/v1",
            model_kwargs={"response_format": {"type": "json_object"}}  # JSON 모드 강제
        )

    async def analyze_image_and_extract_product_name(self, image_base64: str) -> Dict[str, Any]:
        """
        1단계: 이미지 분석 및 상품명 추출 (카테고리 제외)

        Returns:
            {
                "product_name": "노트북 스탠드",
                "key_features": ["높이 조절", "알루미늄"],
                "condition": "거의 새것"
            }
        """
        prompt = ChatPromptTemplate.from_messages([
            ("system", """당신은 상품 이미지 분석 전문가입니다.
이미지를 보고 다음 정보를 JSON 형식으로 추출하세요.

**중요: 반드시 아래 형식의 유효한 JSON만 응답하세요. 다른 설명은 포함하지 마세요.**

**상품명 작성 규칙:**
- 브랜드명이 보이면 반드시 포함 (예: 닌텐도, 애플, 소니 등)
- 모델명이 식별 가능하면 포함 (예: 스위치, 맥북 에어 M1, PS5 등)
- 일반 명사만 사용 금지 (예: ❌ "휴대용 게임기" → ✅ "닌텐도 스위치")
- 브랜드를 알 수 없으면 제품의 고유한 특징 강조 (예: "접이식 노트북 스탠드")

**특징 작성 규칙:**
- 제품의 외관적 특징을 구체적으로 작성 (예: "검은색", "휴대용", "접이식")
- 상태와 관련된 특징도 포함 (예: "깨끗함", "스크래치 없음")
- 용도나 기능도 포함 가능 (예: "게이밍용", "촬영용", "조리용")

응답 형식:
{{{{
  "product_name": "브랜드명 + 모델명 또는 구체적인 제품명 (예: 닌텐도 스위치, 맥북 에어 M1, 캐논 EOS R5)",
  "key_features": ["특징1", "특징2", "특징3", "특징4", "특징5"],
  "condition": "상품 상태 (새것, 거의 새것, 사용감 있음, 많이 사용함)"
}}}}

이미지에서 상품을 인식할 수 없는 경우에도 JSON 형식으로 응답하세요:
{{{{
  "product_name": "알 수 없는 제품",
  "key_features": ["분석 불가"],
  "condition": "알 수 없음"
}}}}"""),
            ("user", [
                {"type": "text", "text": "이 이미지의 상품 정보를 JSON으로만 응답해주세요."},
                {"type": "image_url", "image_url": {
                    "url": f"data:image/jpeg;base64,{image_base64}",
                    "detail": "low"  # 512px로 자동 리사이즈, 토큰 사용량 감소
                }}
            ])
        ])

        chain = prompt | self.llm | StrOutputParser()
        result = await chain.ainvoke({})

        logger.info(f"이미지 분석 결과: {result}")

        # JSON 추출 시도 (여러 패턴 처리)
        result = result.strip()

        # 1. 마크다운 코드블록 제거 (```json ... ``` 또는 ``` ... ```)
        if result.startswith("```"):
            result = result.split("\n", 1)[1] if "\n" in result else result[3:]
            if result.endswith("```"):
                result = result.rsplit("```", 1)[0]

        result = result.strip()

        # 2. JSON 객체 찾기 (중괄호로 시작하는 부분 추출)
        if not result.startswith("{"):
            # 중괄호가 있는 부분만 추출
            start_idx = result.find("{")
            if start_idx != -1:
                end_idx = result.rfind("}")
                if end_idx != -1:
                    result = result[start_idx:end_idx+1]
                    logger.info(f"JSON 추출 완료: {result[:100]}...")
            else:
                # JSON을 찾을 수 없으면 기본값 반환
                logger.warning(f"JSON을 찾을 수 없음. 기본값 사용. 원본: {result}")
                return {
                    "product_name": "알 수 없음",
                    "key_features": ["분석 불가"],
                    "condition": "알 수 없음"
                }

        try:
            return json.loads(result)
        except json.JSONDecodeError as e:
            logger.error(f"JSON 파싱 실패: {e}. 원본: {result}")
            # 파싱 실패 시 기본값 반환
            return {
                "product_name": "알 수 없음",
                "key_features": ["분석 불가"],
                "condition": "알 수 없음"
            }

    async def search_market_prices(self, product_name: str, condition: str, key_features: List[str]) -> Dict[str, Any]:
        """
        2단계: AI로 시장 가격 조사 및 추천 (대여료 + 보증금)

        인터넷 검색 없이 GPT-4o의 학습된 지식으로 시장 가격 추정

        Args:
            product_name: 상품명
            condition: 상품 상태
            key_features: 상품 특징 리스트

        Returns:
            {
                "estimated_purchase_price": 50000,  # 예상 구매가
                "recommended_rental_price": 5000,    # 추천 대여료 (하루)
                "recommended_deposit": 30000,        # 추천 보증금
                "rental_ratio": 0.1,                 # 대여료 비율
                "deposit_ratio": 0.6,                # 보증금 비율
                "reasoning": "설명..."
            }
        """
        prompt = ChatPromptTemplate.from_messages([
            ("system", """당신은 중고 물품 대여 가격 전문가입니다.
주어진 상품 정보를 바탕으로 시장 가격을 분석하고 적절한 대여료와 보증금을 추천해주세요.

**대여료 산정 기준:**
1. 구매가(신품가) 추정
2. 상품 상태별 가치 조정 (새것 100%, 거의 새것 80%, 사용감 있음 60%, 많이 사용함 40%)
3. 상품 종류별 적정 대여료 비율 (하루 기준)
   - 전자기기/노트북/스마트폰: 구매가의 3-5%
   - 카메라/렌즈/조명/악기: 구매가의 5-8%
   - 게임기/캠핑용품/자전거: 구매가의 8-10%
   - 가전제품/주방용품: 구매가의 5-8%
   - 패션/공예도구: 구매가의 10-15%
   - 반려동물 용품: 구매가의 5-10%

**보증금 산정 기준:**
- 보증금 = 현재 가치(구매가 × 상태비율)의 30-50%
- 고가/파손위험 높은 물품: 40-50%
- 중저가/내구성 높은 물품: 30-40%
- 보증금은 합리적인 수준으로, 대여 진입장벽이 너무 높지 않도록 설정

**응답 형식 (JSON):**
{{{{
  "estimated_purchase_price": 1000000,
  "recommended_rental_price": 30000,
  "recommended_deposit": 400000,
  "rental_ratio": 0.03,
  "deposit_ratio": 0.4,
  "reasoning": "MacBook Air M1은 신품가 약 100만원이며, 새것 상태이므로 현재 가치는 100만원입니다. 전자기기이므로 하루 대여료는 3% 수준인 30,000원이 적절하고, 고가 전자기기이므로 보증금은 현재 가치의 40%인 400,000원을 권장합니다. 대여 진입장벽을 고려하여 합리적인 보증금을 설정했습니다."
}}}}"""),
            ("user", f"""다음 상품의 대여료와 보증금을 추천해주세요:

**상품 정보:**
- 상품명: {product_name}
- 주요 특징: {', '.join(key_features)}
- 상태: {condition}

시장에서 일반적으로 거래되는 가격을 바탕으로 적절한 하루 대여료와 보증금을 추천해주세요.""")
        ])

        try:
            chain = prompt | self.llm | StrOutputParser()
            result = await chain.ainvoke({})

            logger.info(f"시장 가격 분석 결과: {result}")

            # JSON 추출
            result = result.strip()
            if result.startswith("```"):
                result = result.split("\n", 1)[1] if "\n" in result else result[3:]
                if result.endswith("```"):
                    result = result.rsplit("```", 1)[0]
            result = result.strip()

            # JSON 객체 찾기
            if not result.startswith("{"):
                start_idx = result.find("{")
                if start_idx != -1:
                    end_idx = result.rfind("}")
                    if end_idx != -1:
                        result = result[start_idx:end_idx+1]

            price_info = json.loads(result)

            return price_info

        except Exception as e:
            logger.error(f"시장 가격 조사 오류: {e}")
            # 기본값 반환 (AI가 가격을 추천하지 못하면 합리적인 기본값 사용)
            default_rental_price = 10000  # 기본 일일요금: 10,000원
            default_deposit = 50000       # 기본 보증금: 50,000원

            logger.warning(f"가격 분석 실패. 기본값 사용: 일일요금={default_rental_price:,}원, 보증금={default_deposit:,}원")

            return {
                "estimated_purchase_price": 100000,  # 예상 구매가 (기본값)
                "recommended_rental_price": default_rental_price,
                "recommended_deposit": default_deposit,
                "rental_ratio": 0.1,
                "deposit_ratio": 0.5,
                "reasoning": "AI 가격 분석 실패로 기본 가격을 적용했습니다. 사용자가 직접 수정해주세요."
            }


    async def generate_final_description(
        self,
        product_info: Dict[str, Any],
        price_info: Dict[str, Any],
        upload_type: str = "RENT"
    ) -> Dict[str, Any]:
        """
        3단계: 모든 정보를 통합하여 최종 설명 및 해시태그 생성

        Returns:
            {
                "title": "...",
                "description": "...",
                "hashtags": ["태그1", "태그2", "태그3", "태그4", "태그5"],
                "recommended_price": 5000,
                "category": "...",
                "confidence": 0.95
            }
        """
        # 가격 추천 정보
        price_context = ""
        if price_info.get("recommended_rental_price"):
            price_context = f"""
**추천 대여료:** {price_info['recommended_rental_price']:,}원/일
**추천 보증금:** {price_info.get('recommended_deposit', 0):,}원
**예상 구매가:** {price_info['estimated_purchase_price']:,}원
**산정 근거:** {price_info['reasoning']}
"""
        else:
            price_context = "**가격:** 협의 가능"

        # upload_type에 따라 톤 변경
        posting_type = "빌려드려요" if upload_type == "RENT" else "빌려요"
        tone_guide = ""
        if upload_type == "RENT":
            tone_guide = """
**빌려드려요 톤:**
- "이 상품을 대여해드립니다" 톤으로 작성
- 상품의 장점과 특징을 강조
- 대여 조건과 가격 명확히 제시
- 예: "깨끗하게 관리한 닌텐도 스위치 대여해드립니다. 하루 15,000원, 보증금 150,000원입니다."
"""
        else:
            tone_guide = """
**빌려요 톤:**
- "이 상품을 빌리고 싶습니다" 톤으로 작성
- 필요한 이유와 용도 설명
- 희망하는 상품 조건 제시
- 예: "닌텐도 스위치를 단기로 빌리고 싶습니다. 깨끗한 상태로 3일간 사용할 예정입니다."
"""

        prompt = ChatPromptTemplate.from_messages([
            ("system", f"""당신은 중고 물품 대여 플랫폼의 전문 게시글 작성자입니다.
주어진 상품 정보와 가격 추천을 바탕으로 매력적인 게시글과 해시태그를 작성하세요.

**게시글 타입: {posting_type}**
{tone_guide}

**응답 형식 (JSON):**
{{{{
  "title": "간결하고 매력적인 제목 (20자 이내)",
  "description": "상세하고 친근한 설명 (200-500자)",
  "hashtags": ["태그1", "태그2", "태그3", "태그4", "태그5"],
  "confidence": 0.95
}}}}

**작성 가이드:**
1. 제목:
   - 제품명을 그대로 사용 (예: "닌텐도 스위치 {posting_type}", "맥북 에어 M1 {posting_type}")
   - 일반 명사 사용 금지 (❌ "휴대용 게임 콘솔 {posting_type}" → ✅ "닌텐도 스위치 {posting_type}")
   - 상태나 특징을 간결하게 추가 가능 (예: "새것같은 닌텐도 스위치 {posting_type}")
2. 설명:
   - 인사말로 시작
   - 상품의 특징과 상태 상세히 설명
   - {'추천 대여료/보증금과 산정 근거 제시' if upload_type == 'RENT' else '희망하는 대여 조건과 기간 제시'}
   - {'대여 시 장점 강조' if upload_type == 'RENT' else '필요한 이유와 용도 설명'}
   - 친근한 마무리
3. 해시태그:
   - 정확히 5개 생성
   - 카테고리, 상품명, 주요 특징, 용도를 고려
   - # 기호 없이 단어만 (예: "노트북", "고성능", "{posting_type}")
4. 존댓말 사용, 이모지 적절히 활용"""),
            ("user", f"""다음 정보를 바탕으로 게시글과 해시태그를 작성해주세요:

**게시글 타입:** {posting_type}

**상품 정보:**
- 상품명: {product_info['product_name']}
- 주요 특징: {', '.join(product_info['key_features'])}
- 상태: {product_info['condition']}

{price_context}
""")
        ])

        chain = prompt | self.llm | StrOutputParser()
        result = await chain.ainvoke({})

        logger.info(f"최종 설명 생성 완료")

        # JSON 추출
        result = result.strip()
        if result.startswith("```"):
            result = result.split("\n", 1)[1] if "\n" in result else result[3:]
            if result.endswith("```"):
                result = result.rsplit("```", 1)[0]
        result = result.strip()

        # JSON 객체 찾기
        if not result.startswith("{"):
            start_idx = result.find("{")
            if start_idx != -1:
                end_idx = result.rfind("}")
                if end_idx != -1:
                    result = result[start_idx:end_idx+1]
                    logger.info(f"JSON 추출 완료 (3단계)")

        parsed_result = json.loads(result)

        # 모든 정보 통합 (카테고리는 제외, 4단계에서 추가)
        return {
            **parsed_result,
            "recommended_price": price_info.get("recommended_rental_price"),
            "recommended_deposit": price_info.get("recommended_deposit"),
            "estimated_purchase_price": price_info.get("estimated_purchase_price"),
            "rental_ratio": price_info.get("rental_ratio"),
            "deposit_ratio": price_info.get("deposit_ratio"),
            "price_reasoning": price_info.get("reasoning")
        }

    async def classify_category(
        self,
        product_info: Dict[str, Any],
        generated_content: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        4단계: 하이브리드 카테고리 분류 (현업 방식)

        빠른 경로 (Fast Path): 룰 베이스 키워드 매칭
        느린 경로 (Slow Path): AI 기반 분류 (확신도 체크)

        Args:
            product_info: 1단계에서 추출한 상품 정보 (상품명, 특징, 상태)
            generated_content: 3단계에서 생성한 내용 (제목, 설명, 해시태그)

        Returns:
            {
                "parent_category": "오락",
                "sub_category": "콘솔 게임기",
                "confidence": 1.0,
                "matched_by": "rule" or "ai" or "none"
            }
        """
        logger.info("=== 하이브리드 카테고리 분류 시작 ===")

        # 1️⃣ 빠른 경로: 룰 베이스 키워드 매칭 (밀리초 단위)
        product_name = product_info.get('product_name', '')
        features = product_info.get('key_features', [])

        rule_match = match_category_by_keywords(product_name, features)

        if rule_match:
            parent_category, sub_category = rule_match
            logger.info(f"✅ [FAST PATH] 룰 베이스 매칭 성공: {parent_category} - {sub_category}")
            return {
                "parent_category": parent_category,
                "sub_category": sub_category,
                "confidence": 1.0,
                "matched_by": "rule"
            }

        logger.info("⚠️ [FAST PATH] 룰 베이스 매칭 실패 → AI 경로로 전환")

        # 2️⃣ 느린 경로: AI 분류 (확신도 체크)
        ai_result = await self._classify_by_ai(product_info, generated_content)

        # 확신도가 충분히 높으면 AI 결과 사용
        if ai_result and ai_result.get('confidence', 0) >= 0.85:
            logger.info(f"✅ [SLOW PATH] AI 분류 성공 (확신도: {ai_result['confidence']:.2f})")
            return {
                **ai_result,
                "matched_by": "ai"
            }

        # 3️⃣ 확신도 낮음 → 기타 카테고리로 분류
        logger.warning(f"❌ [SLOW PATH] AI 확신도 낮음 ({ai_result.get('confidence', 0):.2f}) → 기타 카테고리로 분류")
        return {
            "parent_category": "기타",
            "sub_category": "기타",
            "confidence": 0.0,
            "matched_by": "none"
        }

    async def _classify_by_ai(
        self,
        product_info: Dict[str, Any],
        generated_content: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        AI 기반 카테고리 분류 (내부 함수)

        Returns:
            {
                "parent_category": "...",
                "sub_category": "...",
                "confidence": 0.95
            }
        """
        # 카테고리 목록 및 가이드라인
        categories = """
**상위 카테고리와 하위 카테고리:**
- 창작: 카메라, 렌즈, 조명, 마이크, 악기 (guitar/piano/drum/violin 등 실제 연주용 악기만), 그래픽 태블릿, 오디오 인터페이스
- 공예: 3D프린터, 공예도구, 미술도구, 목공키트, 수공예 재료
- 오락: 콘솔 게임기 (닌텐도 스위치/PS5/Xbox/Steam Deck 등), 보드게임, VR기기, 파티게임, 게이밍 액세서리
- 아웃도어: 텐트, 자전거, 낚싯대, 스키, 캠핑 의자, 등산화
- 생활: 커피머신, 홈트기구, 빔프로젝터, 드론, 스마트홈 기기
- 요리: 에어프라이어, 오븐, 블렌더, 조리도구 세트, 식기류
- 패션: 가방, 시계, 모자, 신발, 액세서리
- 음악·영상 감상: 헤드폰, 스피커, LP플레이어, 프로젝터 스크린, 스트리밍 디바이스
- IT·디지털: 노트북, 태블릿, 스마트폰, 모니터, 외장하드
- 반려생활: 반려동물 장난감, 급식기, 하우스, 산책용품

**카테고리 분류 주의사항:**

1. **게임 관련 (오락 카테고리) - 최우선 확인!**
   - 닌텐도 스위치, Nintendo Switch → "오락" - "콘솔 게임기"
   - PS5, PS4, PlayStation → "오락" - "콘솔 게임기"
   - Xbox, 엑스박스 → "오락" - "콘솔 게임기"
   - Steam Deck, 스팀덱 → "오락" - "콘솔 게임기"
   - 게이밍 마우스, 게이밍 키보드, 게이밍 헤드셋 → "오락" - "게이밍 액세서리"
   - **중요: 게임 콘솔은 절대 악기가 아닙니다! 스위치는 게임기입니다!**

2. **음악 관련 구분**
   - Guitar, Piano, Drum, Violin, Synthesizer 등 실제 연주용 악기 → "창작" - "악기"
   - 헤드폰, 이어폰, 블루투스 스피커 → "음악·영상 감상" (악기 아님!)
   - 마이크, 오디오 인터페이스 → "창작" - "마이크" (녹음/방송 장비)

3. **전자기기 구분**
   - 노트북, 맥북, 아이패드, 태블릿 → "IT·디지털" (창작 아님!)
   - 스마트폰, 갤럭시, 아이폰 → "IT·디지털"
   - 그래픽 태블릿, 와콤 타블렛 → "창작" - "그래픽 태블릿" (디지털 드로잉 전용)

4. **촬영 장비 (창작 카테고리)**
   - 카메라, DSLR, 미러리스 → "창작" - "카메라"
   - 카메라 렌즈 → "창작" - "렌즈"
   - 촬영용 조명, 링라이트 → "창작" - "조명"
   - 일반 LED 조명, 스탠드 → "생활"

5. **영상 감상 vs 촬영**
   - 빔프로젝터, 프로젝터 → "생활" - "빔프로젝터" (감상용)
   - 프로젝터 스크린 → "음악·영상 감상"
   - 영상 촬영 장비 → "창작"

6. **운동/아웃도어 구분**
   - 실내 운동기구, 헬스기구, 요가매트 → "생활" - "홈트기구"
   - 텐트, 캠핑 의자, 침낭 → "아웃도어" (야외 활동)
   - 자전거 → "아웃도어" (실내 자전거도 포함)
   - 등산화, 등산 장비 → "아웃도어"

7. **드론 분류**
   - 모든 드론 → "생활" - "드론" (취미/촬영용 모두)

8. **요리 vs 생활**
   - 에어프라이어, 오븐, 블렌더, 믹서기 → "요리"
   - 커피머신, 에스프레소 머신 → "생활" - "커피머신"
   - 일반 가전제품 → "생활"

9. **패션 액세서리**
   - 가방, 백팩, 크로스백 → "패션" - "가방"
   - 시계, 손목시계, 스마트워치 → "패션" - "시계"
   - 모자, 선글라스 → "패션"
   - 신발, 운동화, 구두 → "패션" - "신발" (등산화는 "아웃도어")

10. **반려동물 용품**
    - 강아지/고양이 장난감, 급식기, 하우스, 리드줄 → "반려생활"
    - 반려동물 관련 아닌 일반 용품은 다른 카테고리

**핵심 원칙:**
- 제품의 **주요 용도**를 기준으로 분류
- 게임기는 절대 악기가 아님!
- 전자기기라고 무조건 IT·디지털이 아님 (용도 확인 필요)
- 제목, 설명, 해시태그에서 나타난 **맥락과 용도**를 최우선으로 고려
"""

        prompt = ChatPromptTemplate.from_messages([
            ("system", f"""당신은 상품 카테고리 분류 전문가입니다.
주어진 상품 정보와 생성된 게시글 내용을 종합적으로 분석하여 가장 적절한 카테고리를 선택하세요.

{categories}

**중요: 반드시 아래 형식의 유효한 JSON만 응답하세요. 다른 설명은 포함하지 마세요.**

**중요: 확신할 수 없으면 confidence를 낮게 설정하세요!**

응답 형식:
{{{{
  "parent_category": "상위 카테고리 (창작, 공예, 오락, 아웃도어, 생활, 요리, 패션, 음악·영상 감상, IT·디지털, 반려생활 중 하나)",
  "sub_category": "하위 카테고리 (위 목록에서 가장 적합한 것 선택)",
  "confidence": 0.95
}}}}

confidence 가이드:
- 0.9~1.0: 매우 명확함 (예: 닌텐도 스위치 → 오락)
- 0.7~0.9: 높은 확신 (일반적인 경우)
- 0.5~0.7: 낮은 확신 (애매한 경우)
- 0.0~0.5: 매우 불확실함"""),
            ("user", f"""다음 정보를 종합하여 상품의 카테고리를 분류해주세요:

**상품 기본 정보:**
- 상품명: {product_info['product_name']}
- 주요 특징: {', '.join(product_info['key_features'])}
- 상태: {product_info['condition']}

**생성된 게시글 정보:**
- 제목: {generated_content['title']}
- 설명 일부: {generated_content['description'][:200]}...
- 해시태그: {', '.join(['#' + tag for tag in generated_content['hashtags']])}

위 모든 정보를 종합하여 가장 적합한 카테고리를 JSON 형식으로만 응답해주세요.""")
        ])

        try:
            chain = prompt | self.llm | StrOutputParser()
            result = await chain.ainvoke({})

            logger.info(f"카테고리 분류 결과: {result}")

            # JSON 추출
            result = result.strip()
            if result.startswith("```"):
                result = result.split("\n", 1)[1] if "\n" in result else result[3:]
                if result.endswith("```"):
                    result = result.rsplit("```", 1)[0]
            result = result.strip()

            # JSON 객체 찾기
            if not result.startswith("{"):
                start_idx = result.find("{")
                if start_idx != -1:
                    end_idx = result.rfind("}")
                    if end_idx != -1:
                        result = result[start_idx:end_idx+1]

            category_info = json.loads(result)
            return category_info

        except Exception as e:
            logger.error(f"카테고리 분류 오류: {e}")
            # AI 오류 시 기타 카테고리 반환
            return {
                "parent_category": "기타",
                "sub_category": "기타",
                "confidence": 0.0
            }

    async def run_full_chain(self, image_base64: str, upload_type: str = "RENT") -> Dict[str, Any]:
        """
        전체 체인 실행: 이미지 → 상품명 추출 → 시장 가격 조사 → 설명 생성 → 카테고리 분류

        Args:
            image_base64: Base64 인코딩된 이미지
            upload_type: 업로드 타입 (RENT: 빌려줘, BORROW: 구해요)

        Returns:
            최종 게시글 정보
        """
        logger.info("=== 고급 AI 체인 시작 ===")

        # 1단계: 이미지 분석 및 상품명 추출 (카테고리 제외)
        logger.info("1단계: 이미지 분석 중...")
        product_info = await self.analyze_image_and_extract_product_name(image_base64)

        # 2단계: AI 기반 시장 가격 조사 (상품명과 특징만으로)
        logger.info("2단계: 시장 가격 조사 중...")
        price_info = await self.search_market_prices(
            product_info["product_name"],
            product_info["condition"],
            product_info.get("key_features", [])
        )

        # 3단계: 최종 설명 및 해시태그 생성
        logger.info(f"3단계: 최종 설명 생성 중... (upload_type={upload_type})")
        final_result = await self.generate_final_description(
            product_info,
            price_info,
            upload_type
        )

        # 4단계: 생성된 텍스트 정보를 종합하여 카테고리 분류
        logger.info("4단계: 카테고리 분류 중...")
        category_info = await self.classify_category(
            product_info,
            final_result
        )

        # 카테고리 정보를 최종 결과에 추가
        final_result["parent_category"] = category_info.get("parent_category")
        final_result["sub_category"] = category_info.get("sub_category")

        logger.info("=== 고급 AI 체인 완료 ===")
        return final_result


# 전역 인스턴스
advanced_chain = AdvancedProductChain()
