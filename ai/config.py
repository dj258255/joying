"""
AI 서비스 설정 파일
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """환경 변수 설정"""

    # SSAFY GMS API
    GMS_API_KEY: str
    GMS_API_URL: str = "https://gms.ssafy.com/api/v1"

    # 서버 설정
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000,https://k13c202.p.ssafy.io"

    # AI 모델 설정
    AI_MODEL: str = "gpt-4o-mini"  # 또는 gemini-2.0-flash
    MAX_TOKENS: int = 2000
    TEMPERATURE: float = 0.7

    class Config:
        env_file = ".env"
        case_sensitive = True

    @property
    def allowed_origins_list(self) -> List[str]:
        """CORS 허용 오리진 리스트 반환"""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]


# 전역 설정 인스턴스
settings = Settings()
