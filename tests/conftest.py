import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine

from app.main import app
from app.models.database import Base
from app.db.session import get_async_session

TEST_DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/ragdb_test"
SYNC_TEST_DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/ragdb_test"

@pytest_asyncio.fixture(scope="session")
async def async_engine():
    engine = create_async_engine(TEST_DATABASE_URL, future=True, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

@pytest_asyncio.fixture
async def async_db_session(async_engine):
    async_session = async_sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session() as session:
        yield session
        await session.rollback()

@pytest.fixture
def sync_db_session():
    engine = create_engine(SYNC_TEST_DATABASE_URL, future=True)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    yield session
    session.rollback()
    session.close()

@pytest.fixture
def test_client(async_db_session):
    def override_get_async_session():
        yield async_db_session

    app.dependency_overrides[get_async_session] = override_get_async_session
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()

@pytest.fixture
def mock_voyage_embedder(monkeypatch):
    class MockEmbedder:
        async def _aget_query_embedding(self, text):
            return [0.1] * 1024
        def get_image_embedding(self, path):
            return [0.2] * 1024

    monkeypatch.setattr(
        "app.core.embedding.VoyageMultimodalEmbedding",
        MockEmbedder
    )
    return MockEmbedder()

@pytest.fixture
def mock_gemini_client(monkeypatch):
    class MockGemini:
        async def generate_from_images(self, query, image_paths, history, system_prompt=""):
            return {
                "text": f"Mocked response for: {query}",
                "prompt_token_count": 100,
                "candidates_token_count": 50,
                "total_token_count": 150,
            }

    monkeypatch.setattr(
        "app.core.llm.GeminiMultimodalClient",
        MockGemini
    )
    return MockGemini()
