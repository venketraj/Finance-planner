from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.db.supabase_client import get_supabase_anon
from app.dependencies import CurrentUser

router = APIRouter(prefix="/api/auth", tags=["auth"])


class SignUpRequest(BaseModel):
    email: str
    password: str
    full_name: str | None = None


class SignInRequest(BaseModel):
    email: str
    password: str


@router.post("/signup")
async def sign_up(req: SignUpRequest) -> dict:
    sb = await get_supabase_anon()
    try:
        res = await sb.auth.sign_up({
            "email": req.email,
            "password": req.password,
            "options": {"data": {"full_name": req.full_name}} if req.full_name else {},
        })
        if res.user is None:
            raise HTTPException(status_code=400, detail="Signup failed: user already registered or invalid input")
        return {
            "user_id": str(res.user.id),
            "email": res.user.email,
            "message": "User created successfully. Check your email for confirmation.",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Signup failed: {e}")


@router.post("/signin")
async def sign_in(req: SignInRequest) -> dict:
    sb = await get_supabase_anon()
    try:
        res = await sb.auth.sign_in_with_password({
            "email": req.email,
            "password": req.password,
        })
        return {
            "access_token": res.session.access_token,
            "refresh_token": res.session.refresh_token,
            "user_id": str(res.user.id),
            "email": res.user.email,
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid credentials: {e}")


@router.post("/signout")
async def sign_out() -> dict:
    return {"message": "Signed out (client should discard tokens)"}


@router.get("/me")
async def get_me(user: CurrentUser) -> dict:
    return user
