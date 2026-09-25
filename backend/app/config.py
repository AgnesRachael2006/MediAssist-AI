from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BACKEND_DIR.parent
ENV_FILES = tuple(path for path in (ROOT_DIR / ".env", BACKEND_DIR / ".env") if path.exists())


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ENV_FILES or None, extra="ignore")

    supabase_url: str = ""
    supabase_service_role_key: str = ""
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    session_secret: str = "dev-only-change-me"
    demo_allow_any_password: bool = True
    cors_origins: str = "http://localhost:3000"
    max_upload_size_mb: int = 8
    ocr_enabled: bool = False
    ocr_provider: str = "tesseract"

    @property
    def origins(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]


settings = Settings()
