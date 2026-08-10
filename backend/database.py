from motor.motor_asyncio import AsyncIOMotorClient
from .core.config import settings
import logging

logger = logging.getLogger(__name__)

client = None
db = None

async def connect_to_mongo():
    global client, db
    if not settings.MONGO_URL or not settings.DB_NAME:
        logger.error(
            "MongoDB connection not started mongo_url_configured=%s db_name_configured=%s",
            bool(settings.MONGO_URL),
            bool(settings.DB_NAME),
        )
        raise RuntimeError("MongoDB requires MONGO_URL (or DATABASE_URL) and DB_NAME")
    logger.info("MongoDB connection starting db=%s", settings.DB_NAME)
    try:
        client = AsyncIOMotorClient(
            settings.MONGO_URL,
            serverSelectionTimeoutMS=settings.MONGO_SERVER_SELECTION_TIMEOUT_MS,
            connectTimeoutMS=settings.MONGO_CONNECT_TIMEOUT_MS
        )
        await client.admin.command('ping')
        db = client[settings.DB_NAME]
        logger.info("MongoDB connection succeeded db=%s", settings.DB_NAME)
    except Exception as exc:
        if client:
            client.close()
        client = None
        db = None
        logger.error("MongoDB connection failed error_type=%s", type(exc).__name__)
        raise

async def close_mongo_connection():
    global client
    if client:
        client.close()
        logger.info("MongoDB connection closed.")

def get_database():
    if db is None:
        raise Exception("Database not initialized. Call connect_to_mongo first.")
    return db
