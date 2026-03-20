"""Reusable async database query helpers for all entities."""

from datetime import date, timedelta

from supabase._async.client import AsyncClient


# ── Profiles ────────────────────────────────────────────────

async def get_profile(sb: AsyncClient, user_id: str) -> dict | None:
    result = await sb.table("profiles").select("*").eq("id", user_id).execute()
    return result.data[0] if result.data else None


async def update_profile(sb: AsyncClient, user_id: str, data: dict) -> dict:
    result = (
        await sb.table("profiles")
        .update(data)
        .eq("id", user_id)
        .execute()
    )
    return result.data[0] if result.data else {}


# ── Transactions ────────────────────────────────────────────

async def list_transactions(
    sb: AsyncClient,
    user_id: str,
    type: str | None = None,
    category: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[dict]:
    query = sb.table("transactions").select("*").eq("user_id", user_id)
    if type:
        query = query.eq("type", type)
    if category:
        query = query.eq("category", category)
    if start_date:
        query = query.gte("transaction_date", start_date.isoformat())
    if end_date:
        query = query.lte("transaction_date", end_date.isoformat())
    result = (
        await query.order("transaction_date", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    return result.data


async def create_transaction(sb: AsyncClient, user_id: str, data: dict) -> dict:
    data["user_id"] = user_id
    result = await sb.table("transactions").insert(data).execute()
    return result.data[0] if result.data else {}


async def delete_transaction(sb: AsyncClient, user_id: str, txn_id: str) -> None:
    await (
        sb.table("transactions")
        .delete()
        .eq("id", txn_id)
        .eq("user_id", user_id)
        .execute()
    )


# ── Portfolio Holdings (unified stock + MF table) ─────────────

async def list_portfolio_holdings(
    sb: AsyncClient, user_id: str, asset_type: str | None = None
) -> list[dict]:
    query = sb.table("portfolio_holdings").select("*").eq("user_id", user_id)
    if asset_type:
        query = query.eq("asset_type", asset_type)
    result = await query.order("investment").execute()
    return result.data


async def delete_user_portfolio_holdings(sb: AsyncClient, user_id: str) -> None:
    """Delete ALL portfolio_holdings rows for a user before a fresh import."""
    await sb.table("portfolio_holdings").delete().eq("user_id", user_id).execute()


async def insert_portfolio_holdings_bulk(
    sb: AsyncClient, user_id: str, rows: list[dict]
) -> None:
    """Insert a batch of pre-validated holding rows."""
    if not rows:
        return
    for row in rows:
        row["user_id"] = user_id
    await sb.table("portfolio_holdings").insert(rows).execute()


# ── Stocks (legacy aliases kept so dashboard router still compiles) ──

async def list_stocks(sb: AsyncClient, user_id: str) -> list[dict]:
    return await list_portfolio_holdings(sb, user_id, asset_type="stock")


async def delete_user_stocks(sb: AsyncClient, user_id: str) -> None:
    await sb.table("portfolio_holdings").delete().eq("user_id", user_id).eq("asset_type", "stock").execute()


async def upsert_stock(sb: AsyncClient, user_id: str, data: dict) -> dict:
    data["user_id"] = user_id
    data["asset_type"] = "stock"
    result = await sb.table("portfolio_holdings").insert(data).execute()
    return result.data[0] if result.data else {}


# ── Mutual Funds (legacy aliases) ────────────────────────────

async def list_mutual_funds(sb: AsyncClient, user_id: str) -> list[dict]:
    return await list_portfolio_holdings(sb, user_id, asset_type="mutual_fund")


async def delete_user_mutual_funds(sb: AsyncClient, user_id: str) -> None:
    await sb.table("portfolio_holdings").delete().eq("user_id", user_id).eq("asset_type", "mutual_fund").execute()


async def upsert_mutual_fund(sb: AsyncClient, user_id: str, data: dict) -> dict:
    data["user_id"] = user_id
    data["asset_type"] = "mutual_fund"
    result = await sb.table("portfolio_holdings").insert(data).execute()
    return result.data[0] if result.data else {}


# ── Other Schemes ─────────────────────────────────────────────

async def list_other_schemes(sb: AsyncClient, user_id: str) -> list[dict]:
    result = (
        await sb.table("other_schemes")
        .select("*")
        .eq("user_id", user_id)
        .order("name")
        .execute()
    )
    return result.data


async def delete_user_other_schemes(sb: AsyncClient, user_id: str) -> None:
    """Delete all other-scheme rows for a user before a fresh import."""
    await sb.table("other_schemes").delete().eq("user_id", user_id).execute()


async def upsert_other_scheme(sb: AsyncClient, user_id: str, data: dict) -> dict:
    data["user_id"] = user_id
    result = (
        await sb.table("other_schemes")
        .upsert(data, on_conflict="user_id,account_id,scheme_type")
        .execute()
    )
    return result.data[0] if result.data else {}


# ── Holdings (legacy compatibility shim) ──────────────────────

async def create_holding(sb: AsyncClient, user_id: str, data: dict) -> dict:
    """Route a manually-added holding to the correct table by asset_type."""
    asset_type = data.get("asset_type", "stock")
    if asset_type == "stock":
        row = {
            "isin":           data.get("ticker"),
            "name":           data.get("name"),
            "ticker":         data.get("ticker"),
            "balance":        data.get("units", 0),
            "closing_price":  data.get("purchase_price", 0),
            "cost_value":     data.get("units", 0) * data.get("purchase_price", 0),
            "market_value":   data.get("units", 0) * data.get("purchase_price", 0),
            "statement_date": data.get("purchase_date"),
            "asset_type":     "stock",
        }
        return await upsert_stock(sb, user_id, row)
    elif asset_type == "mutual_fund":
        row = {
            "isin":           data.get("ticker"),
            "folio":          data.get("folio"),
            "name":           data.get("name"),
            "ticker":         data.get("ticker"),
            "unit_balance":   data.get("units", 0),
            "nav":            data.get("purchase_price", 0),
            "nav_date":       data.get("purchase_date"),
            "cost_value":     data.get("units", 0) * data.get("purchase_price", 0),
            "market_value":   data.get("units", 0) * data.get("purchase_price", 0),
            "statement_date": data.get("purchase_date"),
            "asset_type":     "mutual_fund",
        }
        return await upsert_mutual_fund(sb, user_id, row)
    else:
        row = {
            "scheme_type":    asset_type,
            "account_id":     data.get("ticker"),
            "name":           data.get("name", ""),
            "ticker":         data.get("ticker"),
            "units":          data.get("units", 0),
            "unit_value":     data.get("purchase_price", 0),
            "cost_value":     data.get("units", 0) * data.get("purchase_price", 0),
            "market_value":   data.get("units", 0) * data.get("purchase_price", 0),
            "start_date":     data.get("purchase_date"),
            "statement_date": data.get("purchase_date"),
            "notes":          data.get("notes"),
            "asset_type":     "other_scheme",
        }
        return await upsert_other_scheme(sb, user_id, row)


async def update_holding(
    sb: AsyncClient, user_id: str, holding_id: str, data: dict
) -> dict:
    """Update a holding — tries each table in order."""
    for table in ("stocks", "mutual_funds", "other_schemes"):
        result = (
            await sb.table(table)
            .update(data)
            .eq("id", holding_id)
            .eq("user_id", user_id)
            .execute()
        )
        if result.data:
            return result.data[0]
    return {}


# ── Debts ───────────────────────────────────────────────────

async def list_debts(
    sb: AsyncClient, user_id: str, active_only: bool = True
) -> list[dict]:
    query = sb.table("debts").select("*").eq("user_id", user_id)
    if active_only:
        query = query.eq("is_active", True)
    result = await query.order("start_date", desc=True).execute()
    return result.data


async def create_debt(sb: AsyncClient, user_id: str, data: dict) -> dict:
    data["user_id"] = user_id
    result = await sb.table("debts").insert(data).execute()
    return result.data[0] if result.data else {}


async def update_debt(
    sb: AsyncClient, user_id: str, debt_id: str, data: dict
) -> dict:
    result = (
        await sb.table("debts")
        .update(data)
        .eq("id", debt_id)
        .eq("user_id", user_id)
        .execute()
    )
    return result.data[0] if result.data else {}


# ── Net Worth Snapshots ─────────────────────────────────────

async def upsert_net_worth_snapshot(sb: AsyncClient, user_id: str, data: dict) -> dict:
    data["user_id"] = user_id
    result = (
        await sb.table("net_worth_snapshots")
        .upsert(data, on_conflict="user_id,snapshot_date")
        .execute()
    )
    return result.data[0] if result.data else {}


async def get_net_worth_history(
    sb: AsyncClient, user_id: str, days: int = 365
) -> list[dict]:
    since = (date.today() - timedelta(days=days)).isoformat()
    result = (
        await sb.table("net_worth_snapshots")
        .select("*")
        .eq("user_id", user_id)
        .gte("snapshot_date", since)
        .order("snapshot_date", desc=False)
        .execute()
    )
    return result.data


# ── Portfolio Import Snapshots ────────────────────────────────

async def insert_portfolio_snapshot(sb: AsyncClient, user_id: str, data: dict) -> dict:
    """Save a portfolio value snapshot after each PDF import."""
    data["user_id"] = user_id
    result = (
        await sb.table("portfolio_import_snapshots")
        .insert(data)
        .execute()
    )
    return result.data[0] if result.data else {}


async def get_portfolio_snapshots(
    sb: AsyncClient, user_id: str, limit: int = 24
) -> list[dict]:
    """Get recent portfolio snapshots ordered newest-first."""
    result = (
        await sb.table("portfolio_import_snapshots")
        .select("*")
        .eq("user_id", user_id)
        .order("imported_at", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data
