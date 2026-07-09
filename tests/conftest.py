import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.db.session import get_async_session

@pytest_asyncio.fixture
async def mock_db_session():
    """Membuat Mock AsyncSession untuk menghindari koneksi ke PostgreSQL asli."""
    session = AsyncMock(spec=AsyncSession)
    # Anda bisa menambahkan default behavior mock session di sini jika perlu
    yield session

@pytest_asyncio.fixture
async def client(mock_db_session: AsyncMock):
    """Setup HTTP Client untuk testing FastAPI app."""
    # Override dependency FastAPI untuk menggunakan mock session
    app.dependency_overrides[get_async_session] = lambda: mock_db_session
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
        
    # Cleanup
    app.dependency_overrides.clear()