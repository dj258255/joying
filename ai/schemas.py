"""
API 요청/응답 스키마 정의
"""
from pydantic import BaseModel, Field
from typing import Optional, List


class ProductGenerationRequest(BaseModel):
    """게시글 생성 요청"""
    # 이미지는 multipart/form-data로 전송되므로 여기선 정의하지 않음
    category: Optional[str] = Field(None, description="상품 카테고리 (선택사항)")
    additional_info: Optional[str] = Field(None, description="추가 정보 (선택사항)")


class ProductGenerationResponse(BaseModel):
    """게시글 생성 응답 (GPT-4o 기반)"""
    title: str = Field(..., description="생성된 게시글 제목")
    description: str = Field(..., description="생성된 게시글 내용")
    hashtags: Optional[List[str]] = Field(None, description="AI가 생성한 해시태그 5개")
    parent_category: Optional[str] = Field(None, description="AI가 추천하는 상위 카테고리")
    sub_category: Optional[str] = Field(None, description="AI가 추천하는 하위 카테고리")
    confidence: float = Field(..., description="생성 결과의 신뢰도 (0-1)")
    recommended_price: Optional[int] = Field(None, description="추천 대여료 (원/일)")
    recommended_deposit: Optional[int] = Field(None, description="추천 보증금 (원)")
    estimated_purchase_price: Optional[int] = Field(None, description="예상 구매가 (원)")
    rental_ratio: Optional[float] = Field(None, description="대여료 비율 (구매가 대비)")
    deposit_ratio: Optional[float] = Field(None, description="보증금 비율 (현재 가치 대비)")
    price_reasoning: Optional[str] = Field(None, description="가격 산정 근거")


class ErrorResponse(BaseModel):
    """에러 응답"""
    error: str = Field(..., description="에러 메시지")
    detail: Optional[str] = Field(None, description="상세 에러 정보")
