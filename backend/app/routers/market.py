"""
Market data router — search, fundamentals, screener.
Uses yfinance (free, no API key needed).
"""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Any, Optional

import yfinance as yf
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.dependencies import CurrentUser, SupabaseClient

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/market", tags=["market"])

# Simple in-memory cache: symbol -> (timestamp, data)
_CACHE: dict[str, tuple[float, dict]] = {}
_CACHE_TTL = 900  # 15 minutes

# ── Helpers ──────────────────────────────────────────────────────────────────

def _safe(val: Any, default=None):
    """Return val unless it's None / NaN / inf."""
    try:
        if val is None:
            return default
        f = float(val)
        if f != f or f in (float("inf"), float("-inf")):
            return default
        return round(f, 4) if isinstance(val, float) else val
    except (TypeError, ValueError):
        return default


def _fetch_ticker_info(symbol: str) -> dict:
    """Blocking yfinance call — run in executor."""
    t = yf.Ticker(symbol)
    info = t.info or {}
    return info


def _build_summary(symbol: str, info: dict) -> dict:
    """Build a structured summary from yfinance info dict."""
    return {
        "symbol":              symbol,
        "name":                info.get("longName") or info.get("shortName") or symbol,
        "exchange":            info.get("exchange"),
        "currency":            info.get("currency"),
        "sector":              info.get("sector"),
        "industry":            info.get("industry"),
        # Price
        "current_price":       _safe(info.get("currentPrice") or info.get("regularMarketPrice")),
        "previous_close":      _safe(info.get("previousClose")),
        "day_high":            _safe(info.get("dayHigh")),
        "day_low":             _safe(info.get("dayLow")),
        "fifty_two_week_high": _safe(info.get("fiftyTwoWeekHigh")),
        "fifty_two_week_low":  _safe(info.get("fiftyTwoWeekLow")),
        # Valuation
        "market_cap":          _safe(info.get("marketCap")),
        "pe_ratio":            _safe(info.get("trailingPE")),
        "forward_pe":          _safe(info.get("forwardPE")),
        "pb_ratio":            _safe(info.get("priceToBook")),
        "ps_ratio":            _safe(info.get("priceToSalesTrailing12Months")),
        "ev_ebitda":           _safe(info.get("enterpriseToEbitda")),
        # Fundamentals
        "eps_ttm":             _safe(info.get("trailingEps")),
        "eps_forward":         _safe(info.get("forwardEps")),
        "revenue":             _safe(info.get("totalRevenue")),
        "gross_margins":       _safe(info.get("grossMargins")),
        "operating_margins":   _safe(info.get("operatingMargins")),
        "profit_margins":      _safe(info.get("profitMargins")),
        "roe":                 _safe(info.get("returnOnEquity")),
        "roa":                 _safe(info.get("returnOnAssets")),
        "debt_to_equity":      _safe(info.get("debtToEquity")),
        "current_ratio":       _safe(info.get("currentRatio")),
        "quick_ratio":         _safe(info.get("quickRatio")),
        "book_value":          _safe(info.get("bookValue")),
        "dividend_yield":      _safe(info.get("dividendYield")),
        "payout_ratio":        _safe(info.get("payoutRatio")),
        # Growth
        "earnings_growth":     _safe(info.get("earningsGrowth")),
        "revenue_growth":      _safe(info.get("revenueGrowth")),
        # Shares
        "shares_outstanding":  _safe(info.get("sharesOutstanding")),
        "float_shares":        _safe(info.get("floatShares")),
        "held_pct_insiders":   _safe(info.get("heldPercentInsiders")),
        "held_pct_institutions": _safe(info.get("heldPercentInstitutions")),
        # Description
        "description":         (info.get("longBusinessSummary") or "")[:600] or None,
    }


async def _get_info(symbol: str) -> dict:
    now = time.time()
    if symbol in _CACHE:
        ts, data = _CACHE[symbol]
        if now - ts < _CACHE_TTL:
            return data
    loop = asyncio.get_event_loop()
    info = await loop.run_in_executor(None, _fetch_ticker_info, symbol)
    result = _build_summary(symbol, info)
    _CACHE[symbol] = (now, result)
    return result


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/quote/{symbol}")
async def get_quote(symbol: str, user: CurrentUser) -> dict:
    """
    Fetch full fundamentals for a single symbol.
    symbol: yfinance ticker, e.g. INFY.NS, TCS.BO, RELIANCE.NS
    """
    try:
        return await _get_info(symbol.upper())
    except Exception as e:
        logger.error("quote error for %s: %s", symbol, e)
        raise HTTPException(status_code=502, detail=f"Failed to fetch data for {symbol}")


@router.get("/price/{symbol}")
async def get_price(symbol: str, user: CurrentUser) -> dict:
    """Lightweight price-only endpoint used by price-alert checker."""
    loop = asyncio.get_event_loop()
    info = await loop.run_in_executor(None, _fetch_ticker_info, symbol.upper())
    price = _safe(info.get("currentPrice") or info.get("regularMarketPrice"))
    if price is None:
        raise HTTPException(status_code=502, detail=f"No price data for {symbol}")
    return {"symbol": symbol.upper(), "price": price, "currency": info.get("currency")}


class ScreenerRequest(BaseModel):
    symbols: list[str]              # list of yfinance tickers to screen
    min_pe: Optional[float] = None
    max_pe: Optional[float] = None
    min_pb: Optional[float] = None
    max_pb: Optional[float] = None
    min_roe: Optional[float] = None  # as decimal e.g. 0.15 for 15%
    max_debt_to_equity: Optional[float] = None
    min_market_cap: Optional[float] = None
    max_market_cap: Optional[float] = None
    min_eps: Optional[float] = None
    min_book_value: Optional[float] = None
    min_profit_margin: Optional[float] = None  # as decimal


@router.post("/screener")
async def run_screener(req: ScreenerRequest, user: CurrentUser) -> list[dict]:
    """
    Fetch fundamentals for each symbol and filter by criteria.
    Returns only symbols that match ALL provided filters.
    """
    if len(req.symbols) > 30:
        raise HTTPException(status_code=400, detail="Max 30 symbols per screener request")

    # Fetch all symbols concurrently
    tasks = [_get_info(s.upper()) for s in req.symbols]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    matched: list[dict] = []
    for r in results:
        if isinstance(r, Exception):
            continue
        d = r
        pe  = d.get("pe_ratio")
        pb  = d.get("pb_ratio")
        roe = d.get("roe")
        dte = d.get("debt_to_equity")
        mc  = d.get("market_cap")
        eps = d.get("eps_ttm")
        bv  = d.get("book_value")
        pm  = d.get("profit_margins")

        if req.min_pe is not None and (pe is None or pe < req.min_pe): continue
        if req.max_pe is not None and (pe is None or pe > req.max_pe): continue
        if req.min_pb is not None and (pb is None or pb < req.min_pb): continue
        if req.max_pb is not None and (pb is None or pb > req.max_pb): continue
        if req.min_roe is not None and (roe is None or roe < req.min_roe): continue
        if req.max_debt_to_equity is not None and (dte is None or dte > req.max_debt_to_equity): continue
        if req.min_market_cap is not None and (mc is None or mc < req.min_market_cap): continue
        if req.max_market_cap is not None and (mc is None or mc > req.max_market_cap): continue
        if req.min_eps is not None and (eps is None or eps < req.min_eps): continue
        if req.min_book_value is not None and (bv is None or bv < req.min_book_value): continue
        if req.min_profit_margin is not None and (pm is None or pm < req.min_profit_margin): continue

        matched.append(d)

    return matched
