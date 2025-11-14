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
            openai_api_base="https://gms.ssafy.io/gmsapi/api.openai.com/v1"
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
        prompt = ChatPromptTemplate.from_messages([
            ("system", """당신은 상품 이미지 분석 전문가입니다.
이미지를 보고 다음 정보를 JSON 형식으로 추출하세요:

{{
  "product_name": "상품명 (간결하게)",
  "category": "카테고리 (전자기기, 생활용품, 스포츠/레저, 의류/잡화, 도서/교육, 기타)",
  "key_features": ["특징1", "특징2", "특징3"],
  "condition": "상품 상태 (새것, 거의 새것, 사용감 있음, 많이 사용함)"
}}"""),
            ("user", [
                {"type": "text", "text": "이 상품의 정보를 분석해주세요."},
                {"type": "image_url", "image_url": {
                    "url": f"data:image/jpeg;base64,{image_base64}",
                    "detail": "low"  # 512px로 자동 리사이즈, 토큰 사용량 감소
                }}
            ])
        ])

        chain = prompt | self.llm | StrOutputParser()
        result = await chain.ainvoke({})

        logger.info(f"이미지 분석 결과: {result}")

        # 마크다운 코드블록 제거 (```json ... ``` 또는 ``` ... ```)
        result = result.strip()
        if result.startswith("```"):
            # 첫 번째 줄 제거 (```json 또는 ```)
            result = result.split("\n", 1)[1] if "\n" in result else result[3:]
            # 마지막 ``` 제거
            if result.endswith("```"):
                result = result.rsplit("```", 1)[0]
        result = result.strip()

        return json.loads(result)

    async def search_market_prices(self, product_name: str, category: str) -> Dict[str, Any]:
        """
        2단계: AI로 시장 가격 조사 및 추천

        인터넷 검색 없이 GPT-4o-mini의 학습된 지식으로 시장 가격 추정

        Args:
            product_name: 상품명
            category: 카테고리

        Returns:
            {
                "estimated_purchase_price": 50000,  # 예상 구매가
                "recommended_rental_price": 5000,    # 추천 대여료
                "rental_ratio": 0.1,                 # 대여료 비율 (구매가의 10%)
                "reasoning": "설명..."
            }
        """
        prompt = ChatPromptTemplate.from_messages([
            ("system", """당신은 중고 물품 대여 가격 전문가입니다.
주어진 상품 정보를 바탕으로 시장 가격을 분석하고 적절한 대여료를 추천해주세요.

**대여료 산정 기준:**
1. 구매가(신품가) 추정
2. 상품 카테고리별 적정 대여료 비율
   - 전자기기: 구매가의 3-5% (하루)
   - 생활용품: 구매가의 5-8%
   - 스포츠/레저: 구매가의 8-10%
   - 의류/잡화: 구매가의 10-15%
   - 도서/교육: 구매가의 5-10%
   - 기타: 구매가의 5-10%

**응답 형식 (JSON):**
{{
  "estimated_purchase_price": 50000,
  "recommended_rental_price": 2500,
  "rental_ratio": 0.05,
  "reasoning": "이 상품은 신품 구매가가 약 5만원이며, 전자기기이므로 하루 대여료는 구매가의 5% 수준인 2,500원이 적절합니다."
}}"""),
            ("user", f"""다음 상품의 대여료를 추천해주세요:

**상품 정보:**
- 상품명: {product_name}
- 카테고리: {category}

시장에서 일반적으로 거래되는 가격을 바탕으로 적절한 하루 대여료를 추천해주세요.""")
        ])

        try:
            chain = prompt | self.llm | StrOutputParser()
            result = await chain.ainvoke({})

            logger.info(f"시장 가격 분석 결과: {result}")

            # 마크다운 코드블록 제거
            result = result.strip()
            if result.startswith("```"):
                result = result.split("\n", 1)[1] if "\n" in result else result[3:]
                if result.endswith("```"):
                    result = result.rsplit("```", 1)[0]
            result = result.strip()

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
        3단계: 모든 정보를 통합하여 최종 설명 생성

        Returns:
            {
                "title": "...",
                "description": "...",
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
**예상 구매가:** {price_info['estimated_purchase_price']:,}원
**산정 근거:** {price_info['reasoning']}
"""
        else:
            price_context = "**가격:** 협의 가능"

        prompt = ChatPromptTemplate.from_messages([
            ("system", """당신은 중고 물품 대여 플랫폼의 전문 게시글 작성자입니다.
주어진 상품 정보와 가격 추천을 바탕으로 매력적인 게시글을 작성하세요.

**응답 형식 (JSON):**
{{
  "title": "간결하고 매력적인 제목 (20자 이내)",
  "description": "상세하고 친근한 설명 (200-500자)",
  "confidence": 0.95
}}

**작성 가이드:**
1. 제목: 핵심 특징 + 상태를 간결하게
2. 설명:
   - 인사말로 시작
   - 상품의 특징과 상태 상세히 설명
   - 추천 대여료와 산정 근거 제시
   - 대여 시 장점 강조
   - 친근한 마무리
3. 존댓말 사용, 이모지 적절히 활용"""),
            ("user", f"""다음 정보를 바탕으로 게시글을 작성해주세요:

**상품 정보:**
- 상품명: {product_info['product_name']}
- 카테고리: {product_info['category']}
- 주요 특징: {', '.join(product_info['key_features'])}
- 상태: {product_info['condition']}

{price_context}
""")
        ])

        chain = prompt | self.llm | StrOutputParser()
        result = await chain.ainvoke({})

        logger.info(f"최종 설명 생성 완료")

        # 마크다운 코드블록 제거
        result = result.strip()
        if result.startswith("```"):
            result = result.split("\n", 1)[1] if "\n" in result else result[3:]
            if result.endswith("```"):
                result = result.rsplit("```", 1)[0]
        result = result.strip()

        parsed_result = json.loads(result)

        # 가격 정보 추가
        return {
            **parsed_result,
            "category": product_info["category"],
            "recommended_price": price_info.get("recommended_rental_price"),
            "estimated_purchase_price": price_info.get("estimated_purchase_price"),
            "rental_ratio": price_info.get("rental_ratio"),
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
            product_info["category"]
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
