from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import create_engine, sessionmaker
from app.config import settings

# Async engine & session for FastAPI
async_engine = create_async_engine(
    settings.DATABASE_URL,
    future=True,
    echo=False,
)
AsyncSessionLocal = async_sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)

# Sync engine & session for Celery
sync_engine = create_engine(
    settings.DATABASE_URL.replace("+asyncpg", ""),
    future=True,
    echo=False,
)
SessionLocal = sessionmaker(bind=sync_engine, expire_on_commit=False)

async def get_async_session() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session

def get_sync_session():
    return SessionLocal()
