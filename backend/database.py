from motor.motor_asyncio import AsyncIOMotorClient
from .core.config import settings
import logging

logger = logging.getLogger(__name__)

client = None
db = None

async def connect_to_mongo():
    global client, db
    logger.info(f"Connecting to MongoDB at {settings.MONGO_URL}...")
    try:
        client = AsyncIOMotorClient(
            settings.MONGO_URL,
            serverSelectionTimeoutMS=settings.MONGO_SERVER_SELECTION_TIMEOUT_MS,
            connectTimeoutMS=settings.MONGO_CONNECT_TIMEOUT_MS
        )
        # The ismaster command is cheap and does not require auth.
        await client.admin.command('ismaster')
        db = client[settings.DB_NAME]
        logger.info(f"Successfully connected to MongoDB, database: {settings.DB_NAME}")
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
