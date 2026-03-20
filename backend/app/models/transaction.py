from datetime import date, datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class TransactionCreate(BaseModel):
    type: Literal["expense", "income", "debt_payment", "investment", "transfer"]
    category: str
    amount: float = Field(gt=0)
    description: Optional[str] = None
    transaction_date: date = Field(default_factory=date.today)
    is_recurring: bool = False
    recurrence_interval: Optional[Literal["monthly", "quarterly", "yearly"]] = None
    debt_name: Optional[str] = None


class TransactionResponse(TransactionCreate):
    id: UUID
    user_id: UUID
    created_at: datetime


class TransactionFilters(BaseModel):
    type: Optional[str] = None
    category: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    limit: int = Field(default=50, le=500)
    offset: int = 0
