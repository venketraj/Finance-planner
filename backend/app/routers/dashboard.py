import asyncio
from datetime import date

from fastapi import APIRouter

from app.dependencies import CurrentUser, SupabaseClient
from app.db.queries import (
    get_profile,
    get_net_worth_history,
    list_debts,
    list_stocks,
    list_mutual_funds,
    list_other_schemes,
)
from app.services.net_worth import compute_net_worth

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/net-worth-history")
async def net_worth_history(
    user: CurrentUser, sb: SupabaseClient, days: int = 365
) -> list[dict]:
    return await get_net_worth_history(sb, user["id"], days=days)


@router.get("/debt-paydown")
async def debt_paydown(user: CurrentUser, sb: SupabaseClient) -> dict:
    debts = await list_debts(sb, user["id"], active_only=True)
    if not debts:
        return {"debts": [], "schedule": [], "total_interest": 0, "total_principal": 0}

    schedule: list[dict] = []
    total_interest = 0.0
    total_principal = sum(float(d["outstanding_balance"]) for d in debts)

    debt_states = [
        {
            "name": d["name"],
            "balance": float(d["outstanding_balance"]),
            "monthly_rate": float(d["interest_rate"]) / 100 / 12,
            "emi": float(d.get("emi_amount") or 0),
            "end_date": d.get("end_date"),
        }
        for d in debts
    ]

    current_date = date.today()
    cumulative_interest = 0.0

    for month in range(1, 361):
        month_date = date(
            current_date.year + (current_date.month + month - 1) // 12,
            (current_date.month + month - 1) % 12 + 1,
            1,
        )
        all_paid = True
        month_interest = 0.0
        total_outstanding = 0.0

        for ds in debt_states:
            if ds["balance"] <= 0:
                continue
            if ds["end_date"] and month_date.isoformat() > str(ds["end_date"]):
                ds["balance"] = 0
                continue
            all_paid = False
            interest = ds["balance"] * ds["monthly_rate"]
            if ds["emi"] > interest:
                principal = ds["emi"] - interest
                ds["balance"] = max(0, ds["balance"] - principal)
            else:
                ds["balance"] += interest
            month_interest += interest
            total_outstanding += ds["balance"]

        cumulative_interest += month_interest
        total_interest += month_interest

        schedule.append({
            "month": month_date.isoformat(),
            "outstanding": round(total_outstanding, 2),
            "interest_paid": round(cumulative_interest, 2),
        })

        if all_paid:
            break

    payoff_date = schedule[-1]["month"] if schedule else None

    return {
        "debts": [
            {
                "name": d["name"],
                "outstanding_balance": float(d["outstanding_balance"]),
                "interest_rate": float(d["interest_rate"]),
                "emi_amount": float(d.get("emi_amount") or 0),
            }
            for d in debts
        ],
        "schedule": schedule,
        "total_interest": round(total_interest, 2),
        "total_principal": round(total_principal, 2),
        "payoff_date": payoff_date,
    }


@router.get("/overview")
async def dashboard_overview(user: CurrentUser, sb: SupabaseClient) -> dict:
    """Aggregated dashboard data — reads market_value directly from holdings tables."""
    profile, stocks, mfs, others, debts = await asyncio.gather(
        get_profile(sb, user["id"]),
        list_stocks(sb, user["id"]),
        list_mutual_funds(sb, user["id"]),
        list_other_schemes(sb, user["id"]),
        list_debts(sb, user["id"], active_only=True),
    )

    stock_value = sum(float(r.get("market_value") or 0) for r in stocks)
    mf_value    = sum(float(r.get("market_value") or 0) for r in mfs)
    other_value = sum(float(r.get("market_value") or 0) for r in others)

    total_investments = round(stock_value + mf_value + other_value, 2)
    total_debt        = round(sum(float(d["outstanding_balance"]) for d in debts), 2)
    net_worth         = round(total_investments - total_debt, 2)

    monthly_income   = float(profile.get("monthly_income") or 0) if profile else 0
    monthly_expenses = float(profile.get("monthly_expenses") or 0) if profile else 0
    savings_rate = (
        ((monthly_income - monthly_expenses) / monthly_income * 100)
        if monthly_income > 0
        else 0
    )

    fire_progress_pct = 0.0
    if profile and profile.get("current_age"):
        from app.services.fire_calculator import FireInput, calculate_fire

        total_emi = sum(float(d.get("emi_amount") or 0) for d in debts)
        weighted_rate = (
            sum(float(d["outstanding_balance"]) * float(d["interest_rate"]) for d in debts)
            / total_debt
            if total_debt > 0
            else 0
        )

        inp = FireInput(
            current_age=int(profile["current_age"]),
            retirement_age=int(profile.get("retirement_age") or 60),
            life_expectancy=int(profile.get("life_expectancy") or 85),
            monthly_income=monthly_income,
            monthly_expenses=monthly_expenses,
            current_investments=total_investments,
            current_debt=total_debt,
            monthly_debt_payments=total_emi,
            avg_debt_interest_rate=weighted_rate,
            expected_return=float(profile.get("expected_return") or 0.12),
            expected_inflation=float(profile.get("expected_inflation") or 0.06),
            safe_withdrawal_rate=float(profile.get("safe_withdrawal_rate") or 0.04),
        )
        result = calculate_fire(inp)
        if result.fire_number > 0:
            fire_progress_pct = min(net_worth / result.fire_number * 100, 100)

    return {
        "net_worth": net_worth,
        "total_investments": total_investments,
        "total_debt": total_debt,
        "stocks_value": round(stock_value, 2),
        "mutual_funds_value": round(mf_value, 2),
        "other_value": round(other_value, 2),
        "monthly_income": round(monthly_income, 2),
        "monthly_expenses": round(monthly_expenses, 2),
        "savings_rate": round(savings_rate, 2),
        "fire_progress_pct": round(fire_progress_pct, 2),
    }
