from motor.motor_asyncio import AsyncIOMotorClient
from .core.config import settings
import logging

logger = logging.getLogger(__name__)

client = None
db = None

async def connect_to_mongo():
    global client, db
    mongo_url = settings.MONGO_URL
    db_name = settings.DB_NAME
    missing = []
    if not mongo_url:
        missing.append("MONGO_URL or DATABASE_URL")
    if not db_name:
        missing.append("DB_NAME")
    if missing:
        logger.error("MongoDB connection skipped; missing=%s", missing)
        raise RuntimeError(f"MongoDB is not configured: missing {', '.join(missing)}")

    # Never log a MongoDB URI: it can contain credentials. The hostname is
    # enough to identify the target deployment in startup logs.
    host = mongo_url.split("@", 1)[-1].split("/", 1)[0]
    logger.info("Connecting to MongoDB host=%s database=%s", host, db_name)
    try:
        client = AsyncIOMotorClient(
            mongo_url,
            serverSelectionTimeoutMS=settings.MONGO_SERVER_SELECTION_TIMEOUT_MS,
            connectTimeoutMS=settings.MONGO_CONNECT_TIMEOUT_MS
        )
        # The ismaster command is cheap and does not require auth.
        await client.admin.command('ismaster')
        db = client[db_name]
        logger.info("Successfully connected to MongoDB database=%s", db_name)
    except Exception as e:
        logger.exception("Could not connect to MongoDB.")
        raise e

async def close_mongo_connection():
    global client
    if client:
        client.close()
        logger.info("MongoDB connection closed.")

def get_database():
    if db is None:
        raise Exception("Database not initialized. Call connect_to_mongo first.")
    return db
