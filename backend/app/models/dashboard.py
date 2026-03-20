from datetime import date
from typing import Any, Optional

from pydantic import BaseModel


class NetWorthSnapshot(BaseModel):
    snapshot_date: date
    total_investments: float
    total_debt: float
    net_worth: float
    breakdown: dict[str, Any] = {}


class DashboardOverview(BaseModel):
    net_worth: float
    total_investments: float
    total_debt: float
    monthly_income: float
    monthly_expenses: float
    savings_rate: float
    fire_progress_pct: float
    stocks_value: float
    mutual_funds_value: float


class DebtPaydownSchedule(BaseModel):
    debts: list[dict[str, Any]]
    schedule: list[dict[str, Any]]
    total_interest: float
    total_principal: float
    payoff_date: Optional[date] = None
