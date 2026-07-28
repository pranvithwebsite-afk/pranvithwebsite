"""Vercel serverless entrypoint for the FastAPI backend."""
import logging
import os
from pathlib import Path
import sys


logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO").upper())
logger = logging.getLogger("vercel.startup")

ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = Path(__file__).resolve().parents[1] / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))


def _env_state(name: str) -> str:
    return "SET" if os.environ.get(name) else "MISSING"


def _startup_env_report() -> None:
    required_groups = {
        "database_url": ("MONGO_URL", "DATABASE_URL"),
        "database_name": ("DB_NAME",),
        "jwt_secret": ("JWT_SECRET",),
        "razorpay_key_id": ("RAZORPAY_KEY_ID",),
        "razorpay_secret": ("RAZORPAY_KEY_SECRET", "RAZORPAY_SECRET"),
        "public_origin": ("PUBLIC_SITE_URL", "FRONTEND_URL", "PUBLIC_BASE_URL"),
    }
    missing = [
        label
        for label, names in required_groups.items()
        if not any(os.environ.get(name) for name in names)
    ]
    if missing:
        logger.warning(
            "Vercel backend environment incomplete missing_groups=%s required_names=%s",
            missing,
            required_groups,
        )
    else:
        logger.info("Vercel backend required environment variables are present.")

    logger.info(
        "Vercel backend env snapshot %s",
        {
            "MONGO_URL_OR_DATABASE_URL": "SET" if os.environ.get("MONGO_URL") or os.environ.get("DATABASE_URL") else "MISSING",
            "DB_NAME": _env_state("DB_NAME"),
            "JWT_SECRET": _env_state("JWT_SECRET"),
            "RAZORPAY_KEY_ID": _env_state("RAZORPAY_KEY_ID"),
            "RAZORPAY_KEY_SECRET_OR_RAZORPAY_SECRET": "SET" if os.environ.get("RAZORPAY_KEY_SECRET") or os.environ.get("RAZORPAY_SECRET") else "MISSING",
            "RAZORPAY_WEBHOOK_SECRET": _env_state("RAZORPAY_WEBHOOK_SECRET"),
            "PUBLIC_SITE_URL": _env_state("PUBLIC_SITE_URL"),
            "FRONTEND_URL": _env_state("FRONTEND_URL"),
            "SMTP_HOST": _env_state("SMTP_HOST"),
            "CLOUDFLARE_R2_PUBLIC_BASE_URL": _env_state("CLOUDFLARE_R2_PUBLIC_BASE_URL"),
        },
    )


def _load_app():
    try:
        _startup_env_report()
        # Import through the backend package so relative imports in
        # backend.server (for example .seed_data and .excel_export) keep
        # their package context in Vercel's Python runtime.
        from backend.server import app as fastapi_app  # noqa: E402

        logger.info("FastAPI app imported successfully from %s", BACKEND_DIR)
        return fastapi_app
    except ModuleNotFoundError as exc:
        logger.exception(
            "FastAPI startup failed because a Python module is missing. "
            "Check root/api requirements files and the import path. missing_module=%s backend_dir=%s",
            exc.name,
            BACKEND_DIR,
        )
        raise
    except Exception:
        logger.exception("FastAPI startup failed while importing backend.server.")
        raise


app = _load_app()
