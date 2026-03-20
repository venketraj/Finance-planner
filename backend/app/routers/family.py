"""Family mode — manage additional family members' portfolios."""

from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.dependencies import CurrentUser, SupabaseClient

router = APIRouter(prefix="/api/family", tags=["family"])

RELATIONS = ("spouse", "child", "parent", "sibling", "other")
COLORS    = ("bg-violet-600", "bg-blue-600", "bg-emerald-600", "bg-rose-600", "bg-amber-600", "bg-cyan-600", "bg-pink-600")


class MemberCreate(BaseModel):
    name: str
    relation: str = "spouse"
    color: str = "bg-violet-600"


class MemberUpdate(BaseModel):
    name: Optional[str] = None
    relation: Optional[str] = None
    color: Optional[str] = None


async def _list(sb, owner_id: str) -> list[dict]:
    r = await sb.table("family_members").select("*").eq("owner_id", owner_id).order("created_at").execute()
    return r.data


async def _get(sb, owner_id: str, member_id: str) -> dict | None:
    r = await sb.table("family_members").select("*").eq("owner_id", owner_id).eq("id", member_id).execute()
    return r.data[0] if r.data else None


@router.get("/members")
async def list_members(user: CurrentUser, sb: SupabaseClient) -> list[dict]:
    return await _list(sb, user["id"])


@router.post("/members", status_code=201)
async def create_member(data: MemberCreate, user: CurrentUser, sb: SupabaseClient) -> dict:
    if data.relation not in RELATIONS:
        raise HTTPException(400, f"relation must be one of {RELATIONS}")
    row = data.model_dump()
    row["owner_id"] = user["id"]
    r = await sb.table("family_members").insert(row).execute()
    return r.data[0]


@router.patch("/members/{member_id}")
async def update_member(member_id: str, data: MemberUpdate, user: CurrentUser, sb: SupabaseClient) -> dict:
    existing = await _get(sb, user["id"], member_id)
    if not existing:
        raise HTTPException(404, "Member not found")
    r = await sb.table("family_members").update(data.model_dump(exclude_unset=True)).eq("owner_id", user["id"]).eq("id", member_id).execute()
    return r.data[0]


@router.delete("/members/{member_id}", status_code=204)
async def delete_member(member_id: str, user: CurrentUser, sb: SupabaseClient) -> None:
    await sb.table("family_members").delete().eq("owner_id", user["id"]).eq("id", member_id).execute()


@router.get("/combined-portfolio")
async def combined_portfolio(user: CurrentUser, sb: SupabaseClient) -> dict:
    """Aggregate portfolio values across primary user + all family members."""
    members = await _list(sb, user["id"])
    result  = {"primary": {}, "members": [], "total_value": 0.0}

    async def _val(table: str, uid: str, mid: str | None) -> float:
        q = sb.table(table).select("market_value").eq("user_id", uid)
        if mid:
            q = q.eq("member_id", mid)
        else:
            q = q.is_("member_id", "null")
        r = await q.execute()
        return sum(float(row["market_value"]) for row in r.data)

    # Primary user
    sv = await _val("stocks",        user["id"], None)
    mv = await _val("mutual_funds",  user["id"], None)
    ov = await _val("other_schemes", user["id"], None)
    primary_total = round(sv + mv + ov, 2)
    result["primary"] = {"stocks": round(sv,2), "mutual_funds": round(mv,2), "other": round(ov,2), "total": primary_total}
    result["total_value"] += primary_total

    # Each family member
    for m in members:
        sv = await _val("stocks",        user["id"], m["id"])
        mv = await _val("mutual_funds",  user["id"], m["id"])
        ov = await _val("other_schemes", user["id"], m["id"])
        member_total = round(sv + mv + ov, 2)
        result["members"].append({
            "id":     m["id"],
            "name":   m["name"],
            "relation": m["relation"],
            "color":  m["color"],
            "stocks": round(sv,2),
            "mutual_funds": round(mv,2),
            "other": round(ov,2),
            "total": member_total,
        })
        result["total_value"] += member_total

    result["total_value"] = round(result["total_value"], 2)
    return result
