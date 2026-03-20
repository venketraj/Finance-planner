import asyncio
from fastapi import APIRouter

from app.dependencies import CurrentUser, SupabaseClient
from app.db.queries import list_portfolio_holdings, list_other_schemes

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])


@router.get("/summary")
async def portfolio_summary(user: CurrentUser, sb: SupabaseClient) -> dict:
    """Aggregated portfolio summary from unified portfolio_holdings + other_schemes."""
    holdings, others = await asyncio.gather(
        list_portfolio_holdings(sb, user["id"]),
        list_other_schemes(sb, user["id"]),
    )

    if not holdings and not others:
        return {
            "total_invested": 0.0,
            "current_value":  0.0,
            "total_gain":     0.0,
            "total_gain_pct": 0.0,
            "allocation": {"stock": 0.0, "mutual_fund": 0.0, "other_scheme": 0.0},
            "top_holdings": [],
        }

    stocks_invested = 0.0
    stocks_value    = 0.0
    mf_invested     = 0.0
    mf_value        = 0.0
    other_invested  = 0.0
    other_value     = 0.0
    by_type: dict[str, float] = {"stock": 0.0, "mutual_fund": 0.0, "other_scheme": 0.0}
    top_holdings: list[dict] = []

    for h in holdings:
        invested = float(h.get("invested_amount") or 0)
        val      = float(h.get("market_value") or 0)
        gain_pct = float(h.get("total_gain_pct") or 0)
        name     = h.get("investment") or h.get("investment_code") or ""
        if h["asset_type"] == "stock":
            stocks_invested += invested
            stocks_value    += val
            by_type["stock"] += val
        else:
            mf_invested += invested
            mf_value    += val
            by_type["mutual_fund"] += val
        top_holdings.append({"name": name, "value": round(val, 2), "gain_pct": round(gain_pct, 2)})

    for h in others:
        cost = float(h.get("cost_value") or 0)
        val  = float(h.get("market_value") or 0)
        other_invested += cost
        other_value    += val
        by_type["other_scheme"] += val
        top_holdings.append({
            "name":     h.get("name") or h.get("ticker") or "",
            "value":    round(val, 2),
            "gain_pct": round((val - cost) / cost * 100, 2) if cost > 0 else 0,
        })

    total_invested = stocks_invested + mf_invested + other_invested
    current_value  = stocks_value + mf_value + other_value
    total_gain     = current_value - total_invested

    top_holdings.sort(key=lambda x: x["value"], reverse=True)

    return {
        "total_invested":  round(total_invested, 2),
        "current_value":   round(current_value, 2),
        "stocks_value":    round(stocks_value, 2),
        "mf_invested":     round(mf_invested, 2),
        "mf_value":        round(mf_value, 2),
        "other_invested":  round(other_invested, 2),
        "other_value":     round(other_value, 2),
        "total_gain":      round(total_gain, 2),
        "total_gain_pct":  round(total_gain / total_invested * 100, 2) if total_invested > 0 else 0,
        "allocation":      {k: round(v, 2) for k, v in by_type.items()},
        "top_holdings":    top_holdings[:10],
    }


@router.get("/import-history")
async def portfolio_import_history(user: CurrentUser, sb: SupabaseClient) -> list[dict]:
    """
    Returns the last 24 portfolio snapshots (one per import).
    Used to show growth chart and gain vs previous upload.
    """
    from app.db.queries import get_portfolio_snapshots
    return await get_portfolio_snapshots(sb, user["id"], limit=24)
