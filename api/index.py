"""Vercel serverless entrypoint for the FastAPI backend.

The diagnostic routes below intentionally stay available if the backend package
cannot be imported.  This makes a Vercel startup failure observable without
exposing exception details or secrets in HTTP responses.
"""
import logging
import os
import traceback

from fastapi import FastAPI


logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO").upper())
logger = logging.getLogger("vercel.startup")

app = FastAPI(title="PranvithDOP Vercel Entrypoint")
startup_error_type = None
startup_error_message = None
startup_error_traceback = None


def _env_state(*names: str) -> bool:
    return any(bool(os.environ.get(name)) for name in names)


def _startup_env_report() -> None:
    states = {
        "MONGO_URL_OR_DATABASE_URL_OR_MONGODB_URI": _env_state("MONGO_URL", "DATABASE_URL", "MONGODB_URI"),
        "DB_NAME": _env_state("DB_NAME"),
        "JWT_SECRET": _env_state("JWT_SECRET"),
        "RAZORPAY_KEY_ID": _env_state("RAZORPAY_KEY_ID"),
        "RAZORPAY_KEY_SECRET_OR_RAZORPAY_SECRET": _env_state("RAZORPAY_KEY_SECRET", "RAZORPAY_SECRET"),
        "PUBLIC_SITE_URL_OR_FRONTEND_URL": _env_state("PUBLIC_SITE_URL", "FRONTEND_URL", "PUBLIC_BASE_URL"),
    }
    missing = [name for name, configured in states.items() if not configured]
    logger.info("Vercel backend environment configured=%s missing=%s", states, missing)


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "mongo_configured": _env_state("MONGO_URL", "DATABASE_URL", "MONGODB_URI"),
        "db_name_configured": _env_state("DB_NAME"),
        "jwt_secret_configured": _env_state("JWT_SECRET"),
    }


@app.get("/api/startup-error")
async def startup_error():
    if startup_error_type is None:
        return {"status": "ok", "message": "backend.server imported successfully"}
    return {
        "status": "backend_import_failed",
        "exception": startup_error_type,
        "message": startup_error_message,
    }


try:
    _startup_env_report()
    logger.info("Importing backend.server")
    from backend.server import app as backend_app

    # backend_app already registers the /api-prefixed router. Mounting at the
    # root preserves public URLs such as /api/products without duplication.
    app.mount("/", backend_app)
    logger.info("backend.server imported successfully")
except Exception as exc:  # Keep diagnostic routes alive if application import fails.
    startup_error_type = type(exc).__name__
    startup_error_message = str(exc)
    startup_error_traceback = traceback.format_exc()
    logger.error("BACKEND IMPORT FAILED")
    logger.error("Type: %s", startup_error_type)
    logger.error("Message: %s", startup_error_message)
    logger.error("Cause: %r", exc.__cause__)
    logger.error("Traceback:\n%s", startup_error_traceback)
