"""
고급 AI 체인: 이미지 분석 → 상품명 추출 → 유사 상품 검색 → 가격 추천 → 최종 설명 생성
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
        1단계: 이미지 분석 및 상품명 추출

        Returns:
            {
                "product_name": "노트북 스탠드",
                "category": "전자기기",
                "key_features": ["높이 조절", "알루미늄"],
                "condition": "거의 새것"
            }
        """
        # 카테고리 목록
        categories = """
**상위 카테고리와 하위 카테고리:**
- 창작: 카메라, 렌즈, 조명, 마이크, 악기, 그래픽 태블릿, 오디오 인터페이스
- 공예: 3D프린터, 공예도구, 미술도구, 목공키트, 수공예 재료
- 오락: 콘솔 게임기, 보드게임, VR기기, 파티게임, 게이밍 액세서리
- 아웃도어: 텐트, 자전거, 낚싯대, 스키, 캠핑 의자, 등산화
- 생활: 커피머신, 홈트기구, 빔프로젝터, 드론, 스마트홈 기기
- 요리: 에어프라이어, 오븐, 블렌더, 조리도구 세트, 식기류
- 패션: 가방, 시계, 모자, 신발, 액세서리
- 음악·영상 감상: 헤드폰, 스피커, LP플레이어, 프로젝터 스크린, 스트리밍 디바이스
- IT·디지털: 노트북, 태블릿, 스마트폰, 모니터, 외장하드
- 반려생활: 반려동물 장난감, 급식기, 하우스, 산책용품
"""

        prompt = ChatPromptTemplate.from_messages([
            ("system", f"""당신은 상품 이미지 분석 전문가입니다.
이미지를 보고 다음 정보를 JSON 형식으로 추출하세요.

{categories}

**중요: 반드시 아래 형식의 유효한 JSON만 응답하세요. 다른 설명은 포함하지 마세요.**

응답 형식:
{{{{
  "product_name": "상품명 (간결하게)",
  "parent_category": "상위 카테고리 (창작, 공예, 오락, 아웃도어, 생활, 요리, 패션, 음악·영상 감상, IT·디지털, 반려생활 중 하나)",
  "sub_category": "하위 카테고리 (위 목록에서 가장 적합한 것 선택)",
  "key_features": ["특징1", "특징2", "특징3"],
  "condition": "상품 상태 (새것, 거의 새것, 사용감 있음, 많이 사용함)"
}}}}

이미지에서 상품을 인식할 수 없는 경우에도 JSON 형식으로 응답하세요:
{{{{
  "product_name": "알 수 없음",
  "parent_category": "생활",
  "sub_category": "기타",
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
                    "parent_category": "생활",
                    "sub_category": "커피머신",
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
                "parent_category": "생활",
                "sub_category": "커피머신",
                "key_features": ["분석 불가"],
                "condition": "알 수 없음"
            }

    async def search_market_prices(self, product_name: str, category: str, condition: str) -> Dict[str, Any]:
        """
        2단계: AI로 시장 가격 조사 및 추천 (대여료 + 보증금)

        인터넷 검색 없이 GPT-4o의 학습된 지식으로 시장 가격 추정

        Args:
            product_name: 상품명
            category: 카테고리
            condition: 상품 상태

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
3. 카테고리별 적정 대여료 비율 (하루 기준)
   - 전자기기/IT·디지털: 구매가의 3-5%
   - 창작/음악·영상 감상: 구매가의 5-8%
   - 아웃도어/오락: 구매가의 8-10%
   - 생활/요리: 구매가의 5-8%
   - 패션/공예: 구매가의 10-15%
   - 반려생활: 구매가의 5-10%

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
- 카테고리: {category}
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
            # 기본값 반환
            return {
                "estimated_purchase_price": None,
                "recommended_rental_price": None,
                "rental_ratio": None,
                "reasoning": "가격 정보를 찾을 수 없습니다."
            }


    async def generate_final_description(
        self,
        product_info: Dict[str, Any],
        price_info: Dict[str, Any]
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

        prompt = ChatPromptTemplate.from_messages([
            ("system", """당신은 중고 물품 대여 플랫폼의 전문 게시글 작성자입니다.
주어진 상품 정보와 가격 추천을 바탕으로 매력적인 게시글과 해시태그를 작성하세요.

**응답 형식 (JSON):**
{{{{
  "title": "간결하고 매력적인 제목 (20자 이내)",
  "description": "상세하고 친근한 설명 (200-500자)",
  "hashtags": ["태그1", "태그2", "태그3", "태그4", "태그5"],
  "confidence": 0.95
}}}}

**작성 가이드:**
1. 제목: 핵심 특징 + 상태를 간결하게
2. 설명:
   - 인사말로 시작
   - 상품의 특징과 상태 상세히 설명
   - 추천 대여료/보증금과 산정 근거 제시
   - 대여 시 장점 강조
   - 친근한 마무리
3. 해시태그:
   - 정확히 5개 생성
   - 카테고리, 상품명, 주요 특징, 용도를 고려
   - # 기호 없이 단어만 (예: "노트북", "고성능", "대여")
4. 존댓말 사용, 이모지 적절히 활용"""),
            ("user", f"""다음 정보를 바탕으로 게시글과 해시태그를 작성해주세요:

**상품 정보:**
- 상품명: {product_info['product_name']}
- 카테고리: {product_info.get('sub_category', product_info.get('parent_category', 'IT·디지털'))}
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

        # 모든 정보 통합
        return {
            **parsed_result,
            "parent_category": product_info.get("parent_category"),
            "sub_category": product_info.get("sub_category"),
            "recommended_price": price_info.get("recommended_rental_price"),
            "recommended_deposit": price_info.get("recommended_deposit"),
            "estimated_purchase_price": price_info.get("estimated_purchase_price"),
            "rental_ratio": price_info.get("rental_ratio"),
            "deposit_ratio": price_info.get("deposit_ratio"),
            "price_reasoning": price_info.get("reasoning")
        }

    async def run_full_chain(self, image_base64: str) -> Dict[str, Any]:
        """
        전체 체인 실행: 이미지 → 상품명 추출 → 시장 가격 조사 → 설명 생성

        Args:
            image_base64: Base64 인코딩된 이미지

        Returns:
            최종 게시글 정보
        """
        logger.info("=== 고급 AI 체인 시작 ===")

        # 1단계: 이미지 분석 및 상품명 추출
        logger.info("1단계: 이미지 분석 중...")
        product_info = await self.analyze_image_and_extract_product_name(image_base64)

        # 2단계: AI 기반 시장 가격 조사
        logger.info("2단계: 시장 가격 조사 중...")
        price_info = await self.search_market_prices(
            product_info["product_name"],
            product_info.get("sub_category", product_info.get("parent_category", "")),
            product_info["condition"]
        )

        # 3단계: 최종 설명 생성
        logger.info("3단계: 최종 설명 생성 중...")
        final_result = await self.generate_final_description(
            product_info,
            price_info
        )

        logger.info("=== 고급 AI 체인 완료 ===")
        return final_result


# 전역 인스턴스
advanced_chain = AdvancedProductChain()
