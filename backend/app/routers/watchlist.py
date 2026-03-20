"""Watchlist router — add/remove/list saved instruments."""

from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.dependencies import CurrentUser, SupabaseClient

router = APIRouter(prefix="/api/watchlist", tags=["watchlist"])


class WatchlistItem(BaseModel):
    symbol: str
    name: str
    asset_type: str  # "stock" | "mutual_fund"


async def _list(sb, user_id: str) -> list[dict]:
    r = await sb.table("watchlist").select("*").eq("user_id", user_id).order("added_at", desc=True).execute()
    return r.data


async def _add(sb, user_id: str, item: WatchlistItem) -> dict:
    row = {
        "user_id":   user_id,
        "symbol":    item.symbol.upper(),
        "name":      item.name,
        "asset_type": item.asset_type,
    }
    r = await sb.table("watchlist").upsert(row, on_conflict="user_id,symbol").execute()
    return r.data[0] if r.data else row


async def _remove(sb, user_id: str, symbol: str) -> None:
    await sb.table("watchlist").delete().eq("user_id", user_id).eq("symbol", symbol.upper()).execute()


@router.get("/")
async def list_watchlist(user: CurrentUser, sb: SupabaseClient) -> list[dict]:
    return await _list(sb, user["id"])


@router.post("/", status_code=201)
async def add_to_watchlist(item: WatchlistItem, user: CurrentUser, sb: SupabaseClient) -> dict:
    return await _add(sb, user["id"], item)


@router.delete("/{symbol}", status_code=204)
async def remove_from_watchlist(symbol: str, user: CurrentUser, sb: SupabaseClient) -> None:
    await _remove(sb, user["id"], symbol)
