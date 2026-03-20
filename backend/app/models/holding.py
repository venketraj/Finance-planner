from datetime import date, datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class HoldingCreate(BaseModel):
    asset_type: Literal["stock", "mutual_fund", "lic", "gov_scheme"]
    ticker: str
    name: Optional[str] = None
    units: float = Field(gt=0)
    purchase_price: float = Field(gt=0)
    purchase_date: date
    folio: Optional[str] = None
    notes: Optional[str] = None


class HoldingUpdate(BaseModel):
    units: Optional[float] = Field(default=None, gt=0)
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class HoldingResponse(HoldingCreate):
    id: UUID
    user_id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime


class HoldingWithMarket(HoldingResponse):
    """Enriched with current market data."""
    current_price: Optional[float] = None
    current_value: Optional[float] = None
    gain_loss: Optional[float] = None
    gain_loss_pct: Optional[float] = None
