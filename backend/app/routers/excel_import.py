"""Excel import for portfolio holdings (stocks + mutual funds).

Flow:
  POST /api/holdings/import-excel
    – Upload a single .xlsx / .xls / .csv file
    – Detects asset_type from the "Asset Type" column (case-insensitive)
    – Deletes ALL existing portfolio_holdings rows for the user
    – Inserts fresh rows
    – Creates a portfolio_import_snapshot for history tracking

Expected columns (header row, order flexible):
  Asset Type, Asset Class, Category, Investment Code, Investment, AMC Name,
  MF Direct/Regular, Expense Ratio, Broker, Investment Date,
  Total Units, Invested Amount, Market Value, Holding (%),
  Total Gain/Loss (INR), Total Gain/Loss (%), XIRR (%)
"""

from __future__ import annotations

import io
import logging
from datetime import datetime, timezone
from typing import Any

import openpyxl
from fastapi import APIRouter, HTTPException, UploadFile, File

from app.dependencies import CurrentUser, SupabaseClient
from app.db.queries import (
    delete_user_portfolio_holdings,
    insert_portfolio_holdings_bulk,
    insert_portfolio_snapshot,
    upsert_net_worth_snapshot,
    list_debts,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/holdings", tags=["holdings"])

# ── Column name normalisation map ────────────────────────────────────────────
# Maps various header spellings → canonical field names used internally.
_COL_MAP: dict[str, str] = {
    "asset type":            "asset_type",
    "asset class":           "asset_class",
    "category":              "category",
    "investment code":       "investment_code",
    "investment":            "investment",
    "amc name":              "amc_name",
    "mf direct/regular":     "mf_type",
    "expense ratio":         "expense_ratio",
    "broker":                "broker",
    "investment date":       "investment_date",
    "total units":           "total_units",
    "invested amount":       "invested_amount",
    "market value":          "market_value",
    "holding (%)":           "holding_pct",
    "holding(%)":            "holding_pct",
    "total gain/loss (inr)": "total_gain_inr",
    "total gain/loss(inr)":  "total_gain_inr",
    "total gain/loss (%)":   "total_gain_pct",
    "total gain/loss(%)":    "total_gain_pct",
    "xirr (%)":              "xirr_pct",
    "xirr(%)":               "xirr_pct",
    # alternate spellings
    "scheme name":           "investment",
    "stock name":            "investment",
    "company name":          "investment",
    "isin":                  "investment_code",
    "folio":                 "investment_code",
}

_ASSET_TYPE_MAP: dict[str, str] = {
    "stock":        "stock",
    "stocks":       "stock",
    "equity":       "stock",
    "mutual fund":  "mutual_fund",
    "mutualfund":   "mutual_fund",
    "mf":           "mutual_fund",
    "mutual funds": "mutual_fund",
}


def _norm_col(header: str) -> str:
    key = header.strip().lower()
    if key in _COL_MAP:
        return _COL_MAP[key]
    # Prefix-match for truncated column names (e.g. "investment c" → investment_code)
    for canonical, field in _COL_MAP.items():
        if canonical.startswith(key) or key.startswith(canonical):
            return field
    return key  # unknown column — kept as-is, ignored during row conversion


def _safe_float(val: Any) -> float | None:
    if val is None:
        return None
    s = str(val).replace(",", "").replace("%", "").strip()
    if s in ("", "-", "—", "N/A", "n/a", "NA"):
        return None
    try:
        return float(s)
    except (ValueError, TypeError):
        return None


def _safe_date(val: Any) -> str | None:
    if val is None or val == "":
        return None
    if isinstance(val, datetime):
        return val.date().isoformat()
    s = str(val).strip()
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%m/%d/%Y", "%d-%b-%Y", "%b %d, %Y"):
        try:
            return datetime.strptime(s, fmt).date().isoformat()
        except ValueError:
            continue
    return None


def _parse_xlsx(content: bytes) -> list[dict]:
    wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True)

    # Always use the first sheet regardless of how many sheets exist
    ws = wb.worksheets[0]

    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return []

    # Find header row — must contain BOTH "asset type" cell AND at least one of
    # the known value columns.  This prevents matching metadata rows like
    # "Holding data / As of 2026-03-20" that happen to contain the word "investment".
    HEADER_ANCHORS = {"asset type", "asset class", "invested amount", "market value"}
    header_idx = None
    for i, row in enumerate(rows):
        cells = {str(c).strip().lower() for c in row if c is not None}
        if cells & HEADER_ANCHORS:          # non-empty intersection
            header_idx = i
            break

    if header_idx is None:
        raise ValueError(
            "Could not find a header row. Make sure the sheet contains columns like "
            "'Asset Type', 'Invested Amount', 'Market Value'."
        )

    raw_headers = rows[header_idx]
    headers = [_norm_col(str(h) if h is not None else "") for h in raw_headers]

    records: list[dict] = []
    for row in rows[header_idx + 1:]:
        if all(c is None or str(c).strip() == "" for c in row):
            continue  # skip blank rows
        record: dict[str, Any] = {}
        for h, cell in zip(headers, row):
            if h:
                record[h] = cell
        records.append(record)

    return records


def _parse_csv(content: bytes) -> list[dict]:
    import csv
    text = content.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        return []
    norm_map = {f: _norm_col(f) for f in reader.fieldnames}
    records = []
    for row in reader:
        records.append({norm_map[k]: v for k, v in row.items()})
    return records


def _to_holding_row(record: dict) -> dict | None:
    """Convert a raw parsed record dict into a portfolio_holdings insert dict."""
    raw_type = str(record.get("asset_type") or "").strip().lower()
    asset_type = _ASSET_TYPE_MAP.get(raw_type)
    if not asset_type:
        return None  # skip rows with unknown asset type

    investment = str(record.get("investment") or "").strip()
    if not investment:
        return None  # skip empty name rows

    market_value   = _safe_float(record.get("market_value")) or 0.0
    total_gain_inr = _safe_float(record.get("total_gain_inr"))
    total_gain_pct = _safe_float(record.get("total_gain_pct"))
    invested_amount = _safe_float(record.get("invested_amount"))
    total_units    = _safe_float(record.get("total_units"))

    # --- Derive missing values ---
    # If invested_amount is missing but gain is known: invested = market - gain
    if (invested_amount is None or invested_amount == 0.0) and total_gain_inr is not None:
        derived = market_value - total_gain_inr
        if derived > 0:
            invested_amount = round(derived, 2)

    # If still missing invested_amount but we have units + market_value,
    # we cannot know purchase price — leave as 0 (no cost basis available)
    if invested_amount is None:
        invested_amount = 0.0

    # Derive total_gain_inr if invested_amount is now known and gain is missing
    if total_gain_inr is None and invested_amount > 0:
        total_gain_inr = round(market_value - invested_amount, 2)

    # Derive total_gain_pct if missing
    if total_gain_pct is None and invested_amount > 0 and total_gain_inr is not None:
        total_gain_pct = round((total_gain_inr / invested_amount) * 100, 2)

    return {
        "asset_type":      asset_type,
        "asset_class":     str(record.get("asset_class") or "").strip() or None,
        "category":        str(record.get("category") or "").strip() or None,
        "investment_code": str(record.get("investment_code") or "").strip() or None,
        "investment":      investment,
        "amc_name":        str(record.get("amc_name") or "").strip() or None,
        "mf_type":         str(record.get("mf_type") or "").strip() or None,
        "expense_ratio":   _safe_float(record.get("expense_ratio")),
        "broker":          str(record.get("broker") or "").strip() or None,
        "investment_date": _safe_date(record.get("investment_date")),
        "total_units":     total_units,
        "invested_amount": invested_amount,
        "market_value":    market_value,
        "holding_pct":     _safe_float(record.get("holding_pct")),
        "total_gain_inr":  total_gain_inr,
        "total_gain_pct":  total_gain_pct,
        "xirr_pct":        _safe_float(record.get("xirr_pct")),
    }


# ── Endpoint ─────────────────────────────────────────────────────────────────

@router.post("/import-excel", status_code=200)
async def import_excel(
    user: CurrentUser,
    sb: SupabaseClient,
    file: UploadFile = File(...),
) -> dict:
    """
    Upload one Excel (.xlsx) or CSV file containing portfolio holdings.
    Deletes all existing portfolio_holdings for the user and replaces with fresh data.
    """
    filename = (file.filename or "").lower()
    if not (filename.endswith(".xlsx") or filename.endswith(".xls") or filename.endswith(".csv")):
        raise HTTPException(status_code=400, detail="Only .xlsx, .xls, or .csv files are supported.")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:  # 10 MB guard
        raise HTTPException(status_code=400, detail="File too large (max 10 MB).")

    try:
        if filename.endswith(".csv"):
            raw_records = _parse_csv(content)
        else:
            raw_records = _parse_xlsx(content)
    except Exception as exc:
        logger.exception("Excel parse error")
        raise HTTPException(status_code=422, detail=f"Could not parse file: {exc}") from exc

    rows = [r for rec in raw_records if (r := _to_holding_row(rec)) is not None]

    if not rows:
        raise HTTPException(
            status_code=422,
            detail=(
                "No valid holdings found. Make sure the file has an 'Asset Type' column "
                "with values 'Stock' or 'Mutual Fund'."
            ),
        )

    stocks_count = sum(1 for r in rows if r["asset_type"] == "stock")
    mf_count     = sum(1 for r in rows if r["asset_type"] == "mutual_fund")

    # Replace all holdings
    await delete_user_portfolio_holdings(sb, user["id"])
    await insert_portfolio_holdings_bulk(sb, user["id"], rows)

    # Snapshot for history chart
    total_invested = sum(float(r["invested_amount"] or 0) for r in rows)
    total_value    = sum(float(r["market_value"] or 0) for r in rows)
    stocks_value   = sum(float(r["market_value"] or 0) for r in rows if r["asset_type"] == "stock")
    mf_value       = sum(float(r["market_value"] or 0) for r in rows if r["asset_type"] == "mutual_fund")

    await insert_portfolio_snapshot(sb, user["id"], {
        "imported_at":    datetime.now(timezone.utc).isoformat(),
        "document_type":  "excel",
        "total_invested": round(total_invested, 2),
        "total_value":    round(total_value, 2),
        "stocks_value":   round(stocks_value, 2),
        "mf_value":       round(mf_value, 2),
        "other_value":    0.0,
    })

    # Write a net_worth_snapshot so the dashboard chart updates
    try:
        debts = await list_debts(sb, user["id"], active_only=True)
        total_debt = sum(float(d["outstanding_balance"]) for d in debts)
        await upsert_net_worth_snapshot(sb, user["id"], {
            "snapshot_date":    datetime.now(timezone.utc).date().isoformat(),
            "total_investments": round(total_value, 2),
            "total_debt":       round(total_debt, 2),
            "net_worth":        round(total_value - total_debt, 2),
            "breakdown": {
                "stocks":       round(stocks_value, 2),
                "mutual_funds": round(mf_value, 2),
                "other":        0.0,
            },
        })
    except Exception:
        logger.warning("Could not write net_worth_snapshot after excel import", exc_info=True)

    return {
        "message":       f"Imported {len(rows)} holdings ({stocks_count} stocks, {mf_count} mutual funds).",
        "stocks_count":  stocks_count,
        "mf_count":      mf_count,
        "total_rows":    len(rows),
    }
