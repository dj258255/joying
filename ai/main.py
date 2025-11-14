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
    image: UploadFile = File(..., description="상품 이미지 (JPEG, PNG)"),
    upload_type: str = Form("RENT", description="업로드 타입 (RENT: 빌려줘, BORROW: 구해요)")
):
    """
    AI 이미지 기반 게시글 자동 생성 (GPT-4o 기반)

    **처리 단계:**
    1. 이미지 분석 → 상품명, 카테고리, 특징, 상태 추출
    2. AI 기반 시장 가격 조사 → 대여료 + 보증금 추천
    3. 최종 설명 및 해시태그 생성

    **출력:**
    - title: 생성된 제목 (20자 이내)
    - description: 생성된 설명 (200-500자)
    - hashtags: AI가 생성한 해시태그 5개
    - parent_category: AI가 추천하는 상위 카테고리
    - sub_category: AI가 추천하는 하위 카테고리
    - recommended_price: 추천 대여료 (원/일)
    - recommended_deposit: 추천 보증금 (원)
    - estimated_purchase_price: 예상 구매가 (원)
    - rental_ratio: 대여료 비율 (구매가 대비)
    - deposit_ratio: 보증금 비율 (현재 가치 대비)
    - price_reasoning: 가격 산정 근거
    - confidence: 신뢰도 (0-1)
    """
    try:
        logger.info(f"AI 게시글 생성 요청: filename={image.filename}, upload_type={upload_type}")

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

            # GPT-4o 최적화: detail="low"는 512px로 처리하므로 1536px까지 허용
            # 하지만 Base64 전송 용량을 줄이기 위해 적절한 크기로 리사이즈
            max_size = 1536
            if img.width > max_size or img.height > max_size:
                img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)

            # JPEG로 변환
            if img.mode in ('RGBA', 'LA', 'P'):
                # 투명도 있는 이미지는 RGB로 변환
                img = img.convert('RGB')

            # GPT-4o는 더 큰 이미지를 처리 가능하므로 목표를 200KB로 상향
            quality = 85
            max_file_size = 200 * 1024  # 200KB

            for _ in range(3):  # 최대 3번 시도
                buffer = io.BytesIO()
                img.save(buffer, format='JPEG', quality=quality, optimize=True)
                image_bytes = buffer.getvalue()

                if len(image_bytes) <= max_file_size:
                    break

                # 너무 크면 품질 낮춤
                quality -= 10
                if quality < 50:
                    quality = 50
                    break

            logger.info(f"이미지 최적화 완료: {len(image_bytes)} bytes (quality={quality})")

        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"유효하지 않은 이미지 파일입니다: {str(e)}"
            )

        # Base64 인코딩
        import base64
        image_base64 = base64.b64encode(image_bytes).decode('utf-8')

        # AI 체인 실행
        logger.info(f"AI 체인 시작 (upload_type={upload_type})")
        result = await advanced_chain.run_full_chain(image_base64, upload_type=upload_type)

        # 응답 생성
        response = ProductGenerationResponse(
            title=result.get("title", "제목 없음"),
            description=result.get("description", "설명 없음"),
            hashtags=result.get("hashtags", []),
            parent_category=result.get("parent_category"),
            sub_category=result.get("sub_category"),
            confidence=result.get("confidence", 0.8),
            recommended_price=result.get("recommended_price"),
            recommended_deposit=result.get("recommended_deposit"),
            estimated_purchase_price=result.get("estimated_purchase_price"),
            rental_ratio=result.get("rental_ratio"),
            deposit_ratio=result.get("deposit_ratio"),
            price_reasoning=result.get("price_reasoning")
        )

        logger.info(f"AI 게시글 생성 완료: title={response.title}, price={response.recommended_price}원, deposit={response.recommended_deposit}원, hashtags={len(response.hashtags)}개")
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
