"""PDF import for holdings — CDSL BO (stocks), CAS (mutual funds), Other Schemes.

Flow:
  POST /api/holdings/import-pdf/preview   -- upload PDF + document_type, returns parsed rows
  POST /api/holdings/import-pdf/confirm   -- save confirmed rows (deletes existing of same type first)

document_type: "stock" | "mutual_fund" | "other_scheme"

Parsing:
  stock       → CDSL BO statement (ISIN, name, balance, closing price, value)
  mutual_fund → CAMS / KFintech CAS (folio, ISIN, name, cost, units, nav date, nav, market value)
  other_scheme → Generic number extraction; user reviews/corrects before saving
"""

from __future__ import annotations

import io
import logging
import re
from datetime import date
from typing import Literal, Optional

import pdfplumber

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from app.db.queries import (
    delete_user_stocks,
    delete_user_mutual_funds,
    delete_user_other_schemes,
    upsert_stock,
    upsert_mutual_fund,
    upsert_other_scheme,
    list_stocks,
    list_mutual_funds,
    list_other_schemes,
    insert_portfolio_snapshot,
)
from app.dependencies import CurrentUser, SupabaseClient

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/holdings", tags=["holdings"])

DocumentType = Literal["stock", "mutual_fund", "other_scheme"]


# ── Models ──────────────────────────────────────────────────────────────────────

class StockRow(BaseModel):
    isin: str
    name: str
    ticker: str
    balance: float
    closing_price: float
    cost_value: float
    market_value: float
    statement_date: str
    asset_type: str = "stock"


class MutualFundRow(BaseModel):
    isin: str
    folio: Optional[str] = None
    name: str
    ticker: str
    unit_balance: float
    nav: float
    nav_date: str
    cost_value: float
    market_value: float
    statement_date: str
    asset_type: str = "mutual_fund"


class OtherSchemeRow(BaseModel):
    scheme_type: str           # lic, ppf, nps, fd, bond, other
    account_id: str
    name: str
    ticker: str
    units: float
    unit_value: float
    cost_value: float
    market_value: float
    start_date: str
    statement_date: str
    notes: Optional[str] = None
    asset_type: str = "other_scheme"


class PreviewResponse(BaseModel):
    document_type: str
    stocks: list[StockRow] = []
    mutual_funds: list[MutualFundRow] = []
    other_schemes: list[OtherSchemeRow] = []


class ConfirmRequest(BaseModel):
    document_type: DocumentType
    stocks: list[StockRow] = []
    mutual_funds: list[MutualFundRow] = []
    other_schemes: list[OtherSchemeRow] = []


# ── Helpers ─────────────────────────────────────────────────────────────────────

def _today() -> str:
    return date.today().isoformat()


def _clean_num(s: str) -> Optional[float]:
    if not s:
        return None
    try:
        return float(re.sub(r"[,\s]", "", s.strip()))
    except ValueError:
        return None


def _extract_all_text(pdf_bytes: bytes, password: Optional[str] = None) -> str:
    open_kwargs: dict = {"password": password} if password else {}
    pages_text = []
    with pdfplumber.open(io.BytesIO(pdf_bytes), **open_kwargs) as pdf:
        for page in pdf.pages:
            t = page.extract_text(x_tolerance=2, y_tolerance=2)
            if t:
                pages_text.append(t)
    return "\n".join(pages_text)


# ── Regex ────────────────────────────────────────────────────────────────────────

_ISIN_RE      = re.compile(r"\b(IN[A-Z0-9]{10})\b")
_DATE_RE      = re.compile(r"\d{2}-[A-Za-z]{3}-\d{4}")
_NUM_RE       = re.compile(r"[\d,]+\.\d+")
_FOLIO_RE     = re.compile(r"^\d[\d/]+$")
_REGISTRAR_RE = re.compile(r"\b(CAMS|KFINTECH|KARVY)\b", re.IGNORECASE)


# ── CDSL parser ──────────────────────────────────────────────────────────────────

def _parse_cdsl_text(text: str) -> list[StockRow]:
    rows: list[StockRow] = []
    seen: set[str] = set()
    lines = text.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        m = _ISIN_RE.search(line)
        if not m:
            i += 1
            continue
        isin = m.group(1)
        if isin in seen:
            i += 1
            continue

        combined = line
        j = i + 1
        while j < len(lines):
            next_line = lines[j].strip()
            if not next_line:
                j += 1
                break
            if _ISIN_RE.search(next_line) and not next_line.startswith(isin):
                break
            if re.match(r"^[\d,.\s]+$", next_line):
                combined += " " + next_line
                j += 1
                break
            combined += " " + next_line
            j += 1
        i = j

        after_isin = combined[combined.find(isin) + len(isin):].strip()
        nums = [_clean_num(n) for n in _NUM_RE.findall(after_isin)]
        nums = [n for n in nums if n is not None and n > 0]

        name_raw = _NUM_RE.split(after_isin)[0].strip()
        name_raw = re.sub(r"\b(listed|unlisted|suspended)\b", "", name_raw, flags=re.IGNORECASE).strip()
        name = name_raw if name_raw else isin

        if len(nums) < 2:
            logger.warning("CDSL: skipping %s — not enough numbers: %s", isin, nums)
            continue

        # CDSL row format: ... balance  closing_price  value_inr
        # Try all candidate triples (last 3 numbers) and pick the one where
        # balance × closing_price is closest to the stated market_value.
        # This guards against extra numbers (years, codes) shifting the indices.
        market_value  = nums[-1]
        closing_price = nums[-2] if len(nums) >= 2 else 0.0
        balance       = nums[-3] if len(nums) >= 3 else nums[0]

        # If computed value doesn't match stated value within 5%, try shifting
        if len(nums) >= 3 and closing_price > 0:
            computed = balance * closing_price
            if abs(computed - market_value) / max(market_value, 1) > 0.05:
                # Try taking 4th-from-last as balance
                if len(nums) >= 4:
                    alt_balance = nums[-4]
                    alt_computed = alt_balance * closing_price
                    if abs(alt_computed - market_value) / max(market_value, 1) <= 0.05:
                        balance = alt_balance
                        computed = alt_computed
                # If still no match, just trust the last 3 nums
                balance = nums[-3] if len(nums) >= 3 else nums[0]

        if balance <= 0:
            continue

        # CDSL has no avg-purchase-price column — cost equals current market value
        cost_value = round(market_value, 2)

        seen.add(isin)
        rows.append(StockRow(
            isin=isin,
            name=name,
            ticker=isin,
            balance=balance,
            closing_price=closing_price,
            cost_value=cost_value,
            market_value=round(market_value, 2),
            statement_date=_today(),
        ))
        logger.info("CDSL: %s balance=%.0f closing=%.2f mv=%.2f", isin, balance, closing_price, market_value)

    return rows


# ── CAS parser ───────────────────────────────────────────────────────────────────

def _parse_cas_text(text: str) -> list[MutualFundRow]:
    rows: list[MutualFundRow] = []
    seen: set[str] = set()
    lines = text.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        m = _ISIN_RE.search(line)
        if not m:
            i += 1
            continue
        isin = m.group(1)
        if isin in seen:
            i += 1
            continue

        before = line[:m.start()].strip()
        folio: Optional[str] = None
        folio_match = _FOLIO_RE.match(before.split()[-1]) if before.split() else None
        if folio_match:
            folio = folio_match.group(0)

        after_isin = line[m.end():].strip()
        continuation = after_isin
        j = i + 1
        while j < len(lines):
            next_line = lines[j].strip()
            if not next_line:
                j += 1
                continue
            if _ISIN_RE.search(next_line):
                break
            if _REGISTRAR_RE.search(continuation):
                break
            continuation += " " + next_line
            j += 1
            if _REGISTRAR_RE.search(continuation):
                break
        i = j

        date_m = _DATE_RE.search(continuation)
        nav_date_str = _today()
        if date_m:
            try:
                from datetime import datetime
                nav_date_str = datetime.strptime(date_m.group(0), "%d-%b-%Y").strftime("%Y-%m-%d")
            except ValueError:
                pass

        continuation_no_date = _DATE_RE.sub(" ", continuation)
        nums = [_clean_num(n) for n in _NUM_RE.findall(continuation_no_date)]
        nums = [n for n in nums if n is not None and n > 0]

        scheme_raw = _NUM_RE.split(continuation_no_date)[0].strip()
        scheme_raw = _REGISTRAR_RE.sub("", scheme_raw).strip(" -–")
        scheme_name = scheme_raw if scheme_raw else isin

        if len(nums) < 2:
            logger.warning("CAS: skipping %s — not enough numbers: %s", isin, nums)
            continue

        cost_value   = nums[0]
        unit_balance = nums[1]
        nav          = nums[-2] if len(nums) >= 3 else nums[-1]
        market_value = nums[-1]

        if unit_balance <= 0:
            continue

        seen.add(isin)
        rows.append(MutualFundRow(
            isin=isin,
            folio=folio,
            name=scheme_name,
            ticker=isin,
            unit_balance=unit_balance,
            nav=nav,
            nav_date=nav_date_str,
            cost_value=round(cost_value, 2),
            market_value=round(market_value, 2),
            statement_date=_today(),
        ))
        logger.info("CAS: %s units=%.4f nav=%.4f mv=%.2f", isin, unit_balance, nav, market_value)

    return rows


# ── Endpoints ────────────────────────────────────────────────────────────────────

@router.post("/import-pdf/debug")
async def debug_pdf_import(
    user: CurrentUser,
    file: UploadFile = File(...),
    password: Optional[str] = Form(default=None),
) -> dict:
    pdf_bytes = await file.read()
    try:
        text = _extract_all_text(pdf_bytes, password)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not read PDF: {e}")
    return {"text_length": len(text), "text_sample": text[:3000]}


@router.post("/import-pdf/preview", response_model=PreviewResponse)
async def preview_pdf_import(
    user: CurrentUser,
    file: UploadFile = File(...),
    document_type: str = Form(...),
    password: Optional[str] = Form(default=None),
) -> PreviewResponse:
    """Parse the uploaded PDF according to the chosen document_type."""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")
    if document_type not in ("stock", "mutual_fund", "other_scheme"):
        raise HTTPException(
            status_code=400,
            detail="document_type must be one of: stock, mutual_fund, other_scheme.",
        )

    pdf_bytes = await file.read()
    if len(pdf_bytes) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 50 MB).")

    try:
        text = _extract_all_text(pdf_bytes, password)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not read PDF: {e}")

    logger.info("PDF preview: type=%s text_len=%d", document_type, len(text))

    if document_type == "stock":
        stocks = _parse_cdsl_text(text)
        if not stocks:
            raise HTTPException(
                status_code=422,
                detail="No stock holdings found. Ensure this is a CDSL BO statement PDF.",
            )
        return PreviewResponse(document_type="stock", stocks=stocks)

    elif document_type == "mutual_fund":
        mfs = _parse_cas_text(text)
        if not mfs:
            raise HTTPException(
                status_code=422,
                detail="No mutual fund holdings found. Ensure this is a CAMS/KFintech CAS PDF.",
            )
        return PreviewResponse(document_type="mutual_fund", mutual_funds=mfs)

    else:
        # other_scheme: extract lines with ≥2 numbers for user review
        other: list[OtherSchemeRow] = []
        seen_names: set[str] = set()
        for line in text.splitlines():
            nums = [_clean_num(n) for n in _NUM_RE.findall(line)]
            nums = [n for n in nums if n is not None and n > 0]
            if len(nums) < 2:
                continue
            stripped = line.strip()
            if len(stripped) < 10 or stripped.isdigit():
                continue
            name = _NUM_RE.split(stripped)[0].strip()
            if not name or len(name) < 4:
                continue
            key = name[:30].upper()
            if key in seen_names:
                continue
            seen_names.add(key)
            cost   = nums[-2]
            market = nums[-1]
            acct_id = re.sub(r"\s+", "_", name[:20]).upper()
            other.append(OtherSchemeRow(
                scheme_type="other",
                account_id=acct_id,
                name=name[:80],
                ticker=acct_id,
                units=1,
                unit_value=cost,
                cost_value=round(cost, 2),
                market_value=round(market, 2),
                start_date=_today(),
                statement_date=_today(),
            ))
        if not other:
            raise HTTPException(
                status_code=422,
                detail="Could not extract any rows. Please check the file.",
            )
        return PreviewResponse(document_type="other_scheme", other_schemes=other[:100])


@router.post("/import-pdf/confirm", status_code=201)
async def confirm_pdf_import(
    data: ConfirmRequest,
    user: CurrentUser,
    sb: SupabaseClient,
) -> dict:
    """
    Save rows for the given document_type.
    Deletes ALL existing rows of that type for this user first (full replace on upload).
    """
    uid = user["id"]
    saved, errors = 0, []

    if data.document_type == "stock":
        await delete_user_stocks(sb, uid)
        for row in data.stocks:
            try:
                await upsert_stock(sb, uid, row.model_dump())
                saved += 1
            except Exception as e:
                logger.error("stock upsert failed %s: %s", row.isin, e)
                errors.append(f"{row.name}: {e}")

    elif data.document_type == "mutual_fund":
        await delete_user_mutual_funds(sb, uid)
        for row in data.mutual_funds:
            try:
                await upsert_mutual_fund(sb, uid, row.model_dump())
                saved += 1
            except Exception as e:
                logger.error("mf upsert failed %s: %s", row.isin, e)
                errors.append(f"{row.name}: {e}")

    elif data.document_type == "other_scheme":
        await delete_user_other_schemes(sb, uid)
        for row in data.other_schemes:
            try:
                await upsert_other_scheme(sb, uid, row.model_dump())
                saved += 1
            except Exception as e:
                logger.error("other_scheme upsert failed %s: %s", row.account_id, e)
                errors.append(f"{row.name}: {e}")

    # Save a portfolio snapshot after each import for gain-vs-previous tracking
    try:
        stocks_all = await list_stocks(sb, uid)
        mfs_all    = await list_mutual_funds(sb, uid)
        others_all = await list_other_schemes(sb, uid)
        sv = sum(float(r.get("market_value", 0)) for r in stocks_all)
        mv = sum(float(r.get("market_value", 0)) for r in mfs_all)
        ov = sum(float(r.get("market_value", 0)) for r in others_all)
        ti = (
            sum(float(r.get("cost_value", 0)) for r in stocks_all)
            + sum(float(r.get("cost_value", 0)) for r in mfs_all)
            + sum(float(r.get("cost_value", 0)) for r in others_all)
        )
        await insert_portfolio_snapshot(sb, uid, {
            "document_type": data.document_type,
            "total_invested": round(ti, 2),
            "total_value":    round(sv + mv + ov, 2),
            "stocks_value":   round(sv, 2),
            "mf_value":       round(mv, 2),
            "other_value":    round(ov, 2),
        })
    except Exception as e:
        logger.warning("Snapshot save failed: %s", e)

    return {
        "saved":   saved,
        "errors":  errors,
        "message": f"{saved} row(s) imported." + (f" {len(errors)} failed." if errors else ""),
    }
