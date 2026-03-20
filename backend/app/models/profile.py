from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class ProfileBase(BaseModel):
    full_name: Optional[str] = None
    monthly_income: float = 0
    monthly_expenses: float = 0
    current_age: Optional[int] = None
    retirement_age: int = 60
    life_expectancy: int = 85
    safe_withdrawal_rate: float = 0.04
    expected_inflation: float = 0.06
    expected_return: float = 0.12
    fire_target_annual_expense: Optional[float] = None
    currency: str = "INR"


class ProfileUpdate(ProfileBase):
    pass


class ProfileResponse(ProfileBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
