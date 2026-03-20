from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class MarketCacheEntry(BaseModel):
    ticker: str
    asset_type: str
    last_price: Optional[float] = None
    day_change_pct: Optional[float] = None
    pe_ratio: Optional[float] = None
    de_ratio: Optional[float] = None
    market_cap: Optional[float] = None
    fifty_two_week_high: Optional[float] = None
    fifty_two_week_low: Optional[float] = None
    fundamental_data: dict[str, Any] = {}
    last_updated: datetime
