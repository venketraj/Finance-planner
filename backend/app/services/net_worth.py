"""Net worth aggregation using the new separate holdings tables."""

import logging
from supabase._async.client import AsyncClient

from app.db.queries import (
    list_stocks,
    list_mutual_funds,
    list_other_schemes,
    list_debts,
    upsert_net_worth_snapshot,
)

logger = logging.getLogger(__name__)


async def compute_net_worth(sb: AsyncClient, user_id: str) -> dict:
    """
    Compute current net worth from the three holdings tables.
    Reads market_value directly — no calculations, no market cache.
    """
    stocks       = await list_stocks(sb, user_id)
    mfs          = await list_mutual_funds(sb, user_id)
    others       = await list_other_schemes(sb, user_id)
    debts        = await list_debts(sb, user_id, active_only=True)

    stock_value  = sum(float(r.get("market_value") or 0) for r in stocks)
    mf_value     = sum(float(r.get("market_value") or 0) for r in mfs)
    other_value  = sum(float(r.get("market_value") or 0) for r in others)

    total_investments = stock_value + mf_value + other_value
    total_debt        = sum(float(d["outstanding_balance"]) for d in debts)
    net_worth         = total_investments - total_debt

    return {
        "total_investments": round(total_investments, 2),
        "stocks":            round(stock_value, 2),
        "mutual_funds":      round(mf_value, 2),
        "other_schemes":     round(other_value, 2),
        "total_debt":        round(total_debt, 2),
        "net_worth":         round(net_worth, 2),
    }
