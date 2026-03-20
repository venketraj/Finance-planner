from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from datetime import date

from app.dependencies import CurrentUser, SupabaseClient
from app.db.queries import list_portfolio_holdings, list_other_schemes, insert_portfolio_holdings_bulk, upsert_net_worth_snapshot, list_debts
import logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/holdings", tags=["holdings"])


class ManualHolding(BaseModel):
    asset_type: str          # "stock" | "mutual_fund"
    investment: str          # name
    investment_code: Optional[str] = None
    asset_class: Optional[str] = None
    category: Optional[str] = None
    amc_name: Optional[str] = None
    mf_type: Optional[str] = None
    expense_ratio: Optional[float] = None
    broker: Optional[str] = None
    investment_date: Optional[date] = None
    total_units: Optional[float] = None
    invested_amount: float = 0.0
    market_value: float = 0.0
    holding_pct: Optional[float] = None
    total_gain_inr: Optional[float] = None
    total_gain_pct: Optional[float] = None
    xirr_pct: Optional[float] = None


@router.get("/stocks")
async def get_stocks(user: CurrentUser, sb: SupabaseClient) -> list[dict]:
    return await list_portfolio_holdings(sb, user["id"], asset_type="stock")


@router.get("/mutual-funds")
async def get_mutual_funds(user: CurrentUser, sb: SupabaseClient) -> list[dict]:
    return await list_portfolio_holdings(sb, user["id"], asset_type="mutual_fund")


@router.get("/other-schemes")
async def get_other_schemes(user: CurrentUser, sb: SupabaseClient) -> list[dict]:
    return await list_other_schemes(sb, user["id"])


@router.post("/manual", status_code=201)
async def add_manual_holding(
    data: ManualHolding, user: CurrentUser, sb: SupabaseClient
) -> dict:
    row = data.model_dump()
    if row.get("investment_date"):
        row["investment_date"] = row["investment_date"].isoformat()
    # Derive gain if not provided
    if row["total_gain_inr"] is None and row["invested_amount"] > 0:
        row["total_gain_inr"] = round(row["market_value"] - row["invested_amount"], 2)
    if row["total_gain_pct"] is None and row["invested_amount"] > 0 and row["total_gain_inr"] is not None:
        row["total_gain_pct"] = round((row["total_gain_inr"] / row["invested_amount"]) * 100, 2)
    await insert_portfolio_holdings_bulk(sb, user["id"], [row])

    # Refresh net_worth_snapshot so dashboard chart stays current
    try:
        from datetime import date as _date, timezone as _tz, datetime as _dt
        all_holdings = await list_portfolio_holdings(sb, user["id"])
        debts = await list_debts(sb, user["id"], active_only=True)
        total_value = sum(float(h.get("market_value") or 0) for h in all_holdings)
        total_debt  = sum(float(d["outstanding_balance"]) for d in debts)
        stocks_value = sum(float(h.get("market_value") or 0) for h in all_holdings if h.get("asset_type") == "stock")
        mf_value     = sum(float(h.get("market_value") or 0) for h in all_holdings if h.get("asset_type") == "mutual_fund")
        await upsert_net_worth_snapshot(sb, user["id"], {
            "snapshot_date":     _date.today().isoformat(),
            "total_investments": round(total_value, 2),
            "total_debt":        round(total_debt, 2),
            "net_worth":         round(total_value - total_debt, 2),
            "breakdown": {"stocks": round(stocks_value, 2), "mutual_funds": round(mf_value, 2)},
        })
    except Exception:
        logger.warning("Could not write net_worth_snapshot after manual add", exc_info=True)

    return {"message": "Holding added successfully."}
