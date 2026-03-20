from fastapi import APIRouter, HTTPException

from app.dependencies import CurrentUser, SupabaseClient
from app.db.queries import get_profile, update_profile
from app.models.profile import ProfileUpdate, ProfileResponse

router = APIRouter(prefix="/api/profiles", tags=["profiles"])


@router.get("/", response_model=ProfileResponse)
async def get_user_profile(user: CurrentUser, sb: SupabaseClient) -> dict:
    profile = await get_profile(sb, user["id"])
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@router.put("/", response_model=ProfileResponse)
async def update_user_profile(
    data: ProfileUpdate, user: CurrentUser, sb: SupabaseClient
) -> dict:
    updated = await update_profile(
        sb, user["id"], data.model_dump(exclude_unset=True)
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Profile not found")
    return updated
