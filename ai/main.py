"""
이미지 기반 게시글 자동 생성 AI 서비스
"""
import json
import logging
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image
import io

from config import settings
from schemas import ProductGenerationResponse, ErrorResponse
from advanced_chain import advanced_chain

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# FastAPI 앱 생성
app = FastAPI(
    title="상품 게시글 자동 생성 AI",
    description="이미지를 업로드하면 GPT-4o-mini가 게시글 제목과 설명을 자동으로 생성합니다.",
    version="1.0.0"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """헬스 체크"""
    return {
        "status": "healthy",
        "service": "Product Description AI",
        "model": settings.AI_MODEL
    }


@app.post(
    "/api/generate",
    response_model=ProductGenerationResponse,
    responses={
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse}
    }
)
async def generate_product_description(
    image: UploadFile = File(..., description="상품 이미지 (JPEG, PNG)")
):
    """
    AI 이미지 기반 게시글 자동 생성 (가격 추천 포함)

    **처리 단계:**
    1. 이미지 분석 → 상품명 추출
    2. AI 기반 시장 가격 조사
    3. 모든 정보를 통합하여 최종 설명 생성

    **출력:**
    - title: 생성된 제목
    - description: 생성된 설명 (가격 정보 포함)
    - recommended_price: 추천 대여료
    - estimated_purchase_price: 예상 구매가
    - rental_ratio: 대여료 비율
    - price_reasoning: 가격 산정 근거
    - category_suggestion: AI가 제안하는 카테고리
    - confidence: 신뢰도 (0-1)
    """
    try:
        logger.info(f"AI 게시글 생성 요청: filename={image.filename}")

        # 이미지 검증
        if not image.content_type.startswith("image/"):
            raise HTTPException(
                status_code=400,
                detail="이미지 파일만 업로드 가능합니다. (JPEG, PNG)"
            )

        # 이미지 읽기 및 전처리
        image_bytes = await image.read()

        try:
            img = Image.open(io.BytesIO(image_bytes))
            logger.info(f"이미지 정보: size={img.size}, format={img.format}")

            # 리사이즈
            max_size = 2048
            if img.width > max_size or img.height > max_size:
                img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
                buffer = io.BytesIO()
                img.save(buffer, format=img.format or 'JPEG')
                image_bytes = buffer.getvalue()

        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"유효하지 않은 이미지 파일입니다: {str(e)}"
            )

        # Base64 인코딩
        import base64
        image_base64 = base64.b64encode(image_bytes).decode('utf-8')

        # AI 체인 실행
        logger.info("AI 체인 시작")
        result = await advanced_chain.run_full_chain(image_base64)

        # 응답 생성
        response = ProductGenerationResponse(
            title=result.get("title", "제목 없음"),
            description=result.get("description", "설명 없음"),
            category_suggestion=result.get("category"),
            confidence=result.get("confidence", 0.8),
            recommended_price=result.get("recommended_price"),
            estimated_purchase_price=result.get("estimated_purchase_price"),
            rental_ratio=result.get("rental_ratio"),
            price_reasoning=result.get("price_reasoning")
        )

        logger.info(f"AI 게시글 생성 완료: title={response.title}, price={response.recommended_price}원")
        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI 게시글 생성 실패: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"게시글 생성 중 오류 발생: {str(e)}"
        )


@app.get("/health")
async def health_check():
    """상세 헬스 체크"""
    return {
        "status": "healthy",
        "model": settings.AI_MODEL,
        "gms_api_configured": bool(settings.GMS_API_KEY),
        "max_tokens": settings.MAX_TOKENS,
        "temperature": settings.TEMPERATURE
    }


if __name__ == "__main__":
    import uvicorn

    logger.info(f"서버 시작: {settings.HOST}:{settings.PORT}")
    logger.info(f"모델: {settings.AI_MODEL}")
    logger.info(f"CORS 허용 오리진: {settings.allowed_origins_list}")

    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
        log_level="info"
    )
