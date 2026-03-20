"""Alert configuration and evaluation.

Alert types:
  sip_reminder   — monthly SIP due on a specific day
  emi_reminder   — loan EMI due on a specific day
  rebalance      — portfolio allocation has drifted from target
  budget         — a transaction category exceeded monthly budget
  fire_milestone — FIRE corpus hit 25/50/75/100%
"""

from __future__ import annotations

import logging
from datetime import date, datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.dependencies import CurrentUser, SupabaseClient
from app.db.queries import (
    get_profile,
    list_stocks,
    list_mutual_funds,
    list_other_schemes,
    list_debts,
    list_transactions,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/alerts", tags=["alerts"])


# ── Pydantic models ──────────────────────────────────────────────────────────

class AlertCreate(BaseModel):
    alert_type: str
    label: str
    enabled: bool = True
    reminder_day: Optional[int] = None
    reminder_note: Optional[str] = None
    category: Optional[str] = None
    budget_amount: Optional[float] = None
    target_allocation: Optional[dict[str, float]] = None
    drift_threshold: Optional[float] = 5.0
    milestone_pct: Optional[int] = None
    # price_target fields
    symbol: Optional[str] = None
    target_price: Optional[float] = None
    direction: Optional[str] = None      # "above" | "below"
    alert_window_days: Optional[int] = None


class AlertUpdate(BaseModel):
    label: Optional[str] = None
    enabled: Optional[bool] = None
    reminder_day: Optional[int] = None
    reminder_note: Optional[str] = None
    category: Optional[str] = None
    budget_amount: Optional[float] = None
    target_allocation: Optional[dict[str, float]] = None
    drift_threshold: Optional[float] = None
    milestone_pct: Optional[int] = None
    symbol: Optional[str] = None
    target_price: Optional[float] = None
    direction: Optional[str] = None
    alert_window_days: Optional[int] = None


# ── DB helpers ───────────────────────────────────────────────────────────────

async def _list_alerts(sb, user_id: str) -> list[dict]:
    r = await sb.table("alerts_config").select("*").eq("user_id", user_id).order("created_at").execute()
    return r.data


async def _get_alert(sb, user_id: str, alert_id: str) -> dict | None:
    r = (
        await sb.table("alerts_config")
        .select("*")
        .eq("user_id", user_id)
        .eq("id", alert_id)
        .execute()
    )
    return r.data[0] if r.data else None


async def _create_alert(sb, user_id: str, data: dict) -> dict:
    data["user_id"] = user_id
    r = await sb.table("alerts_config").insert(data).execute()
    return r.data[0]


async def _update_alert(sb, user_id: str, alert_id: str, data: dict) -> dict:
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    r = (
        await sb.table("alerts_config")
        .update(data)
        .eq("user_id", user_id)
        .eq("id", alert_id)
        .execute()
    )
    return r.data[0] if r.data else {}


async def _delete_alert(sb, user_id: str, alert_id: str) -> None:
    await sb.table("alerts_config").delete().eq("user_id", user_id).eq("id", alert_id).execute()


# ── Alert evaluation ─────────────────────────────────────────────────────────

async def _evaluate_alert(sb, user_id: str, alert: dict) -> dict | None:
    """
    Evaluate a single alert against live data.
    Returns a triggered-alert dict or None if not triggered.
    """
    atype  = alert["alert_type"]
    today  = date.today()

    # ── SIP reminder ────────────────────────────────────────────────────────
    if atype == "sip_reminder" and alert.get("reminder_day"):
        day = int(alert["reminder_day"])
        days_until = (day - today.day) % 28  # wrap around month end
        if days_until <= 3:
            return {
                "id":      alert["id"],
                "type":    "sip_reminder",
                "label":   alert["label"],
                "message": f"SIP due in {days_until} day(s) — {alert.get('reminder_note', '')}",
                "severity": "info",
                "days_until": days_until,
            }

    # ── EMI reminder ────────────────────────────────────────────────────────
    if atype == "emi_reminder" and alert.get("reminder_day"):
        day = int(alert["reminder_day"])
        days_until = (day - today.day) % 28
        if days_until <= 5:
            return {
                "id":      alert["id"],
                "type":    "emi_reminder",
                "label":   alert["label"],
                "message": f"EMI due in {days_until} day(s) — {alert.get('reminder_note', '')}",
                "severity": "warning",
                "days_until": days_until,
            }

    # ── Portfolio rebalance ──────────────────────────────────────────────────
    if atype == "rebalance" and alert.get("target_allocation"):
        stocks  = await list_stocks(sb, user_id)
        mfs     = await list_mutual_funds(sb, user_id)
        others  = await list_other_schemes(sb, user_id)
        sv = sum(float(r.get("market_value", 0)) for r in stocks)
        mv = sum(float(r.get("market_value", 0)) for r in mfs)
        ov = sum(float(r.get("market_value", 0)) for r in others)
        total = sv + mv + ov
        if total <= 0:
            return None
        actual = {
            "stock":        round(sv / total * 100, 1),
            "mutual_fund":  round(mv / total * 100, 1),
            "other_scheme": round(ov / total * 100, 1),
        }
        target    = alert["target_allocation"]
        threshold = float(alert.get("drift_threshold") or 5.0)
        drifts = {
            k: round(actual.get(k, 0) - float(target.get(k, 0)), 1)
            for k in target
        }
        worst = max(abs(v) for v in drifts.values())
        if worst >= threshold:
            lines = [f"{k}: {actual.get(k,0)}% (target {target.get(k,0)}%, drift {drifts[k]:+.1f}%)" for k in target]
            return {
                "id":       alert["id"],
                "type":     "rebalance",
                "label":    alert["label"],
                "message":  f"Portfolio has drifted >{threshold}% from target.\n" + "\n".join(lines),
                "severity": "warning",
                "actual":   actual,
                "target":   target,
                "drifts":   drifts,
            }

    # ── Budget alert ─────────────────────────────────────────────────────────
    if atype == "budget" and alert.get("category") and alert.get("budget_amount"):
        # Sum expenses in this category for the current month
        month_start = today.replace(day=1).isoformat()
        txns = await list_transactions(sb, user_id, type="expense")
        spent = sum(
            float(t["amount"])
            for t in txns
            if t.get("category") == alert["category"]
            and t.get("date", "") >= month_start
        )
        limit = float(alert["budget_amount"])
        if spent >= limit:
            pct = round(spent / limit * 100, 0)
            return {
                "id":       alert["id"],
                "type":     "budget",
                "label":    alert["label"],
                "message":  f"'{alert['category']}' budget exceeded: ₹{spent:,.0f} of ₹{limit:,.0f} ({pct:.0f}%)",
                "severity": "error" if spent > limit * 1.1 else "warning",
                "spent":    round(spent, 2),
                "limit":    limit,
                "pct":      pct,
            }

    # ── FIRE milestone ───────────────────────────────────────────────────────
    if atype == "fire_milestone" and alert.get("milestone_pct"):
        profile = await get_profile(sb, user_id)
        if not profile or not profile.get("current_age"):
            return None
        stocks  = await list_stocks(sb, user_id)
        mfs     = await list_mutual_funds(sb, user_id)
        others  = await list_other_schemes(sb, user_id)
        debts   = await list_debts(sb, user_id, active_only=True)
        total_val  = (
            sum(float(r.get("market_value", 0)) for r in stocks)
            + sum(float(r.get("market_value", 0)) for r in mfs)
            + sum(float(r.get("market_value", 0)) for r in others)
        )
        total_debt = sum(float(d["outstanding_balance"]) for d in debts)
        net_worth  = total_val - total_debt

        monthly_exp = float(profile.get("monthly_expenses") or 0)
        swr         = float(profile.get("safe_withdrawal_rate") or 0.04)
        fire_num    = (monthly_exp * 12 / swr) if swr > 0 and monthly_exp > 0 else 0
        if fire_num <= 0:
            return None

        progress_pct = min(net_worth / fire_num * 100, 100)
        target_pct   = int(alert["milestone_pct"])

        if progress_pct >= target_pct:
            return {
                "id":           alert["id"],
                "type":         "fire_milestone",
                "label":        alert["label"],
                "message":      f"🎉 You've reached {target_pct}% of your FIRE corpus! Current progress: {progress_pct:.1f}%",
                "severity":     "success",
                "progress_pct": round(progress_pct, 1),
                "fire_number":  round(fire_num, 0),
                "net_worth":    round(net_worth, 0),
            }

    # ── Price target ─────────────────────────────────────────────────────────
    if atype == "price_target" and alert.get("symbol") and alert.get("target_price") and alert.get("direction"):
        try:
            import yfinance as yf
            import asyncio
            loop = asyncio.get_event_loop()
            ticker_info = await loop.run_in_executor(None, lambda: yf.Ticker(alert["symbol"]).info)
            price = ticker_info.get("currentPrice") or ticker_info.get("regularMarketPrice")
            if price is None:
                return None
            price = float(price)
            target = float(alert["target_price"])
            direction = alert["direction"]
            triggered = (direction == "above" and price >= target) or (direction == "below" and price <= target)
            if triggered:
                return {
                    "id":           alert["id"],
                    "type":         "price_target",
                    "label":        alert["label"],
                    "message":      f"{alert['symbol']} is at ₹{price:,.2f} — your target was {direction} ₹{target:,.2f}",
                    "severity":     "warning",
                    "symbol":       alert["symbol"],
                    "current_price": price,
                    "target_price": target,
                    "direction":    direction,
                }
        except Exception as e:
            logger.warning("Price target eval failed for %s: %s", alert.get("symbol"), e)

    return None


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/")
async def list_alerts(user: CurrentUser, sb: SupabaseClient) -> list[dict]:
    return await _list_alerts(sb, user["id"])


@router.post("/", status_code=201)
async def create_alert(
    data: AlertCreate, user: CurrentUser, sb: SupabaseClient
) -> dict:
    return await _create_alert(sb, user["id"], data.model_dump(exclude_none=True))


@router.patch("/{alert_id}")
async def update_alert(
    alert_id: str, data: AlertUpdate, user: CurrentUser, sb: SupabaseClient
) -> dict:
    existing = await _get_alert(sb, user["id"], alert_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Alert not found")
    return await _update_alert(sb, user["id"], alert_id, data.model_dump(exclude_unset=True))


@router.delete("/{alert_id}", status_code=204)
async def delete_alert(
    alert_id: str, user: CurrentUser, sb: SupabaseClient
) -> None:
    await _delete_alert(sb, user["id"], alert_id)


@router.get("/evaluate")
async def evaluate_alerts(user: CurrentUser, sb: SupabaseClient) -> dict:
    """Evaluate all enabled alerts and return triggered ones."""
    configs  = await _list_alerts(sb, user["id"])
    enabled  = [a for a in configs if a.get("enabled", True)]
    triggered: list[dict] = []

    for alert in enabled:
        try:
            result = await _evaluate_alert(sb, user["id"], alert)
            if result:
                triggered.append(result)
        except Exception as e:
            logger.warning("Alert eval failed for %s: %s", alert.get("id"), e)

    return {
        "total_configured": len(configs),
        "total_enabled":    len(enabled),
        "triggered":        triggered,
        "triggered_count":  len(triggered),
    }
