"""Data export — CSV downloads and full JSON backup/restore."""

import csv
import io
import json
from datetime import datetime, timezone

from fastapi import APIRouter
from fastapi.responses import StreamingResponse, JSONResponse

from app.dependencies import CurrentUser, SupabaseClient
from app.db.queries import (
    list_stocks, list_mutual_funds, list_other_schemes,
    list_debts, list_transactions, get_profile,
)

router = APIRouter(prefix="/api/export", tags=["export"])


def _csv_response(rows: list[dict], filename: str) -> StreamingResponse:
    if not rows:
        output = io.StringIO()
        output.write("no data\n")
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=rows[0].keys())
    writer.writeheader()
    writer.writerows(rows)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _clean(rows: list[dict]) -> list[dict]:
    """Remove user_id from exported rows."""
    return [{k: v for k, v in r.items() if k != "user_id"} for r in rows]


@router.get("/stocks.csv")
async def export_stocks(user: CurrentUser, sb: SupabaseClient) -> StreamingResponse:
    rows = await list_stocks(sb, user["id"])
    return _csv_response(_clean(rows), "stocks.csv")


@router.get("/mutual-funds.csv")
async def export_mutual_funds(user: CurrentUser, sb: SupabaseClient) -> StreamingResponse:
    rows = await list_mutual_funds(sb, user["id"])
    return _csv_response(_clean(rows), "mutual_funds.csv")


@router.get("/other-schemes.csv")
async def export_other_schemes(user: CurrentUser, sb: SupabaseClient) -> StreamingResponse:
    rows = await list_other_schemes(sb, user["id"])
    return _csv_response(_clean(rows), "other_schemes.csv")


@router.get("/transactions.csv")
async def export_transactions(user: CurrentUser, sb: SupabaseClient) -> StreamingResponse:
    rows = await list_transactions(sb, user["id"])
    return _csv_response(_clean(rows), "transactions.csv")


@router.get("/debts.csv")
async def export_debts(user: CurrentUser, sb: SupabaseClient) -> StreamingResponse:
    rows = await list_debts(sb, user["id"])
    return _csv_response(_clean(rows), "debts.csv")


@router.get("/backup.json")
async def full_backup(user: CurrentUser, sb: SupabaseClient):
    """Full JSON backup of all user data."""
    profile  = await get_profile(sb, user["id"])
    stocks   = await list_stocks(sb, user["id"])
    mfs      = await list_mutual_funds(sb, user["id"])
    others   = await list_other_schemes(sb, user["id"])
    debts    = await list_debts(sb, user["id"])
    txns     = await list_transactions(sb, user["id"])

    backup = {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "version": "1.0",
        "profile":        {k: v for k, v in (profile or {}).items() if k != "id"},
        "stocks":         _clean(stocks),
        "mutual_funds":   _clean(mfs),
        "other_schemes":  _clean(others),
        "debts":          _clean(debts),
        "transactions":   _clean(txns),
    }

    filename = f"financeplanner_backup_{datetime.now().strftime('%Y%m%d')}.json"
    return StreamingResponse(
        iter([json.dumps(backup, indent=2, default=str)]),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
