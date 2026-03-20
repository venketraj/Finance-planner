from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.db.supabase_client import get_supabase

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> dict:
    """
    Verify JWT via Supabase auth.getUser() (server-side verification).
    Returns dict with 'id' and 'email'.
    """
    sb = await get_supabase()
    try:
        res = await sb.auth.get_user(credentials.credentials)
        if res is None or res.user is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"id": str(res.user.id), "email": res.user.email}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {e}")
