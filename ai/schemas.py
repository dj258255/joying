"""
API 요청/응답 스키마 정의
"""
from pydantic import BaseModel, Field
from typing import Optional


class ProductGenerationRequest(BaseModel):
    """게시글 생성 요청"""
    # 이미지는 multipart/form-data로 전송되므로 여기선 정의하지 않음
    category: Optional[str] = Field(None, description="상품 카테고리 (선택사항)")
    additional_info: Optional[str] = Field(None, description="추가 정보 (선택사항)")


class ProductGenerationResponse(BaseModel):
    """게시글 생성 응답"""
    title: str = Field(..., description="생성된 게시글 제목")
    description: str = Field(..., description="생성된 게시글 내용")
    category_suggestion: Optional[str] = Field(None, description="AI가 제안하는 카테고리")
    confidence: float = Field(..., description="생성 결과의 신뢰도 (0-1)")
    recommended_price: Optional[int] = Field(None, description="추천 대여료 (원/일)")
    estimated_purchase_price: Optional[int] = Field(None, description="예상 구매가 (원)")
    rental_ratio: Optional[float] = Field(None, description="대여료 비율 (구매가 대비)")
    price_reasoning: Optional[str] = Field(None, description="가격 산정 근거")


class ErrorResponse(BaseModel):
    """에러 응답"""
    error: str = Field(..., description="에러 메시지")
    detail: Optional[str] = Field(None, description="상세 에러 정보")
