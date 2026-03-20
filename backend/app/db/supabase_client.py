from supabase import acreate_client, AsyncClient
from app.config import settings

_client: AsyncClient | None = None

async def get_supabase() -> AsyncClient:
    """Get the service-role Supabase client (bypasses RLS). Used by scheduler."""
    global _client
    if _client is None:
        _client = await acreate_client(
            settings.supabase_url,
            settings.supabase_service_role_key,
        )
    return _client

async def get_supabase_anon() -> AsyncClient:
    """Get an anon-key Supabase client (respects RLS). Used for user-context ops."""
    return await acreate_client(
        settings.supabase_url,
        settings.supabase_anon_key,
    )