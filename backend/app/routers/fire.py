from dataclasses import asdict

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.dependencies import CurrentUser, SupabaseClient
from app.db.queries import get_profile, list_debts
from app.services.fire_calculator import FireInput, FireResult, calculate_fire
from app.services.net_worth import compute_net_worth

router = APIRouter(prefix="/api/fire", tags=["fire"])


class FireSimulateRequest(BaseModel):
    current_age: int
    retirement_age: int
    life_expectancy: int = 85
    monthly_income: float
    monthly_expenses: float
    current_investments: float
    current_debt: float = 0
    monthly_debt_payments: float = 0
    avg_debt_interest_rate: float = 0
    expected_return: float = 0.12
    expected_inflation: float = 0.06
    safe_withdrawal_rate: float = 0.04


@router.get("/projection")
async def fire_projection(user: CurrentUser, sb: SupabaseClient) -> dict:
    """Compute FIRE projection from user's actual profile, holdings, and debts."""
    profile = await get_profile(sb, user["id"])
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    if not profile.get("current_age"):
        raise HTTPException(status_code=400, detail="Set your current age in profile settings")

    nw = await compute_net_worth(sb, user["id"])
    debts = await list_debts(sb, user["id"], active_only=True)

    total_emi = sum(float(d.get("emi_amount") or 0) for d in debts)
    total_debt = float(nw["total_debt"])

    # Weighted average interest rate
    if total_debt > 0:
        weighted_rate = sum(
            float(d["outstanding_balance"]) * float(d["interest_rate"])
            for d in debts
        ) / total_debt
    else:
        weighted_rate = 0

    inp = FireInput(
        current_age=int(profile["current_age"]),
        retirement_age=int(profile.get("retirement_age") or 60),
        life_expectancy=int(profile.get("life_expectancy") or 85),
        monthly_income=float(profile.get("monthly_income") or 0),
        monthly_expenses=float(profile.get("monthly_expenses") or 0),
        current_investments=float(nw["total_investments"]),
        current_debt=total_debt,
        monthly_debt_payments=total_emi,
        avg_debt_interest_rate=weighted_rate,
        expected_return=float(profile.get("expected_return") or 0.12),
        expected_inflation=float(profile.get("expected_inflation") or 0.06),
        safe_withdrawal_rate=float(profile.get("safe_withdrawal_rate") or 0.04),
    )

    result = calculate_fire(inp)
    return asdict(result)


@router.post("/simulate")
async def fire_simulate(params: FireSimulateRequest) -> dict:
    """Run a FIRE simulation with custom parameters (what-if analysis)."""
    inp = FireInput(**params.model_dump())
    result = calculate_fire(inp)
    return asdict(result)
