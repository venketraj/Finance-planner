from typing import Annotated

from fastapi import Depends
from supabase._async.client import AsyncClient

from app.services.auth_service import get_current_user
from app.db.supabase_client import get_supabase

CurrentUser = Annotated[dict, Depends(get_current_user)]
SupabaseClient = Annotated[AsyncClient, Depends(get_supabase)]
