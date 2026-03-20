from datetime import date
from typing import Optional

from fastapi import APIRouter, HTTPException

from app.dependencies import CurrentUser, SupabaseClient
from app.db.queries import list_transactions, create_transaction, delete_transaction
from app.models.transaction import TransactionCreate, TransactionResponse

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


@router.get("/", response_model=list[TransactionResponse])
async def get_transactions(
    user: CurrentUser,
    sb: SupabaseClient,
    type: Optional[str] = None,
    category: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    limit: int = 50,
    offset: int = 0,
) -> list[dict]:
    return await list_transactions(
        sb, user["id"],
        type=type,
        category=category,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        offset=offset,
    )


@router.post("/", response_model=TransactionResponse, status_code=201)
async def add_transaction(
    data: TransactionCreate, user: CurrentUser, sb: SupabaseClient
) -> dict:
    row = data.model_dump()
    row["transaction_date"] = row["transaction_date"].isoformat()
    return await create_transaction(sb, user["id"], row)


@router.delete("/{txn_id}", status_code=204)
async def remove_transaction(
    txn_id: str, user: CurrentUser, sb: SupabaseClient
) -> None:
    await delete_transaction(sb, user["id"], txn_id)


@router.get("/summary")
async def transaction_summary(
    user: CurrentUser,
    sb: SupabaseClient,
    months: int = 1,
) -> dict:
    """Aggregated spending by category for the last N months."""
    from datetime import timedelta

    start = date.today() - timedelta(days=months * 30)
    txns = await list_transactions(
        sb, user["id"], start_date=start, limit=500
    )

    by_category: dict[str, float] = {}
    total_income = 0.0
    total_expense = 0.0

    for t in txns:
        amount = float(t["amount"])
        if t["type"] == "income":
            total_income += amount
        elif t["type"] in ("expense", "debt_payment"):
            total_expense += amount
            cat = t["category"]
            by_category[cat] = by_category.get(cat, 0) + amount

    return {
        "period_months": months,
        "total_income": round(total_income, 2),
        "total_expense": round(total_expense, 2),
        "by_category": {k: round(v, 2) for k, v in by_category.items()},
    }
