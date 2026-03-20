"""FIRE (Financial Independence, Retire Early) projection engine."""

from dataclasses import dataclass, field
from typing import Optional

import numpy_financial as npf


@dataclass
class FireInput:
    current_age: int
    retirement_age: int
    life_expectancy: int
    monthly_income: float
    monthly_expenses: float
    current_investments: float
    current_debt: float
    monthly_debt_payments: float
    avg_debt_interest_rate: float  # Annual rate as decimal, e.g. 0.085
    expected_return: float  # Annual, e.g. 0.12
    expected_inflation: float  # Annual, e.g. 0.06
    safe_withdrawal_rate: float  # e.g. 0.04


@dataclass
class FireResult:
    fire_number: float
    years_to_fire: Optional[float]
    fire_age: Optional[int]
    monthly_savings_needed: float
    current_savings_rate: float
    projected_corpus_at_retirement: float
    is_fire_ready: bool
    inflation_adjusted_annual_expense: float
    year_by_year: list[dict] = field(default_factory=list)


def calculate_fire(inp: FireInput) -> FireResult:
    """
    Core FIRE calculation with:
    - Inflation-adjusted future expenses
    - Debt interest as negative cash flow
    - Real (inflation-adjusted) returns
    - Year-by-year projection for charting
    """
    years_to_retire = max(inp.retirement_age - inp.current_age, 0)
    years_in_retirement = max(inp.life_expectancy - inp.retirement_age, 0)

    # Inflation-adjusted annual expense at retirement
    annual_expense_today = inp.monthly_expenses * 12
    annual_expense_at_retirement = annual_expense_today * (
        (1 + inp.expected_inflation) ** years_to_retire
    )

    # FIRE number using PV of annuity over retirement years
    # Real return = (1 + nominal) / (1 + inflation) - 1 (exact formula)
    real_return = (1 + inp.expected_return) / (1 + inp.expected_inflation) - 1

    if real_return > 0 and years_in_retirement > 0:
        fire_number = annual_expense_at_retirement * (
            (1 - (1 + real_return) ** (-years_in_retirement)) / real_return
        )
    else:
        fire_number = annual_expense_at_retirement / inp.safe_withdrawal_rate

    # Monthly investable surplus
    monthly_investable = (
        inp.monthly_income - inp.monthly_expenses - inp.monthly_debt_payments
    )

    # Year-by-year simulation
    monthly_return = (1 + inp.expected_return) ** (1 / 12) - 1
    corpus = inp.current_investments
    debt = inp.current_debt
    year_by_year: list[dict] = []
    fire_age: Optional[int] = None

    for year in range(1, years_to_retire + 1):
        for _month in range(12):
            # Investment growth + monthly contribution
            corpus = corpus * (1 + monthly_return) + max(monthly_investable, 0)

            # Debt amortization
            if debt > 0 and inp.monthly_debt_payments > 0:
                interest_this_month = debt * (inp.avg_debt_interest_rate / 12)
                principal_payment = inp.monthly_debt_payments - interest_this_month
                if principal_payment > 0:
                    debt = max(0, debt - principal_payment)

        net_worth = corpus - debt
        year_by_year.append({
            "year": year,
            "age": inp.current_age + year,
            "corpus": round(corpus, 2),
            "debt": round(debt, 2),
            "net_worth": round(net_worth, 2),
            "fire_target": round(fire_number, 2),
        })

        if fire_age is None and net_worth >= fire_number:
            fire_age = inp.current_age + year

    projected_corpus = corpus
    is_fire_ready = (inp.current_investments - inp.current_debt) >= fire_number

    # Monthly savings needed to reach FIRE number
    monthly_savings_needed = 0.0
    if years_to_retire > 0 and monthly_return > 0:
        months = years_to_retire * 12
        fv_current = inp.current_investments * ((1 + monthly_return) ** months)
        shortfall = fire_number - fv_current
        if shortfall > 0:
            monthly_savings_needed = abs(
                npf.pmt(monthly_return, months, 0, -shortfall)
            )

    savings_rate = (
        (monthly_investable / inp.monthly_income * 100)
        if inp.monthly_income > 0
        else 0
    )

    return FireResult(
        fire_number=round(fire_number, 2),
        years_to_fire=(fire_age - inp.current_age) if fire_age else None,
        fire_age=fire_age,
        monthly_savings_needed=round(float(monthly_savings_needed), 2),
        current_savings_rate=round(savings_rate, 2),
        projected_corpus_at_retirement=round(projected_corpus, 2),
        is_fire_ready=is_fire_ready,
        inflation_adjusted_annual_expense=round(annual_expense_at_retirement, 2),
        year_by_year=year_by_year,
    )
