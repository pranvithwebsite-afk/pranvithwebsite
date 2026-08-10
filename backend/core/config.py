import os
from dotenv import load_dotenv
from pathlib import Path
from urllib.parse import urlparse

# Load .env file from the backend directory
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

class Settings:
    def _first_env(self, *names: str) -> str:
        for name in names:
            value = os.environ.get(name)
            if value:
                return value
        return ""

    @property
    def MONGO_URL(self) -> str:
        return self._first_env('MONGO_URL', 'DATABASE_URL', 'MONGODB_URI')

    @property
    def DB_NAME(self) -> str:
        explicit_name = os.environ.get('DB_NAME')
        if explicit_name:
            return explicit_name
        try:
            return (urlparse(self.MONGO_URL).path or '').strip('/').split('/', 1)[0]
        except ValueError:
            return ''

    @property
    def MONGO_SERVER_SELECTION_TIMEOUT_MS(self) -> int:
        return int(os.environ.get("MONGO_SERVER_SELECTION_TIMEOUT_MS", "8000"))

    @property
    def MONGO_CONNECT_TIMEOUT_MS(self) -> int:
        return int(os.environ.get("MONGO_CONNECT_TIMEOUT_MS", "8000"))
        
    @property
    def JWT_SECRET(self) -> str:
        return os.environ.get("JWT_SECRET", "")

    @property
    def RAZORPAY_KEY_ID(self) -> str:
        return os.environ.get('RAZORPAY_KEY_ID', '')

    @property
    def RAZORPAY_KEY_SECRET(self) -> str:
        return self._first_env('RAZORPAY_KEY_SECRET', 'RAZORPAY_SECRET')

    @property
    def PUBLIC_SITE_URL(self) -> str:
        return os.environ.get("PUBLIC_SITE_URL") or os.environ.get("FRONTEND_URL") or "https://pranvithdop.com"


settings = Settings()
