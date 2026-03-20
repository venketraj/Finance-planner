from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class DebtCreate(BaseModel):
    name: str
    principal: float = Field(gt=0)
    outstanding_balance: float = Field(gt=0)
    interest_rate: float = Field(ge=0)
    emi_amount: Optional[float] = Field(default=None, gt=0)
    start_date: date
    end_date: Optional[date] = None


class DebtUpdate(BaseModel):
    outstanding_balance: Optional[float] = Field(default=None, gt=0)
    emi_amount: Optional[float] = Field(default=None, gt=0)
    end_date: Optional[date] = None
    is_active: Optional[bool] = None


class DebtResponse(DebtCreate):
    id: UUID
    user_id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime
