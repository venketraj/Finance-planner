from fastapi import APIRouter

from app.dependencies import CurrentUser, SupabaseClient
from app.db.queries import list_debts, create_debt, update_debt
from app.models.debt import DebtCreate, DebtUpdate, DebtResponse

router = APIRouter(prefix="/api/debts", tags=["debts"])


@router.get("/", response_model=list[DebtResponse])
async def get_debts(
    user: CurrentUser,
    sb: SupabaseClient,
    active_only: bool = True,
) -> list[dict]:
    return await list_debts(sb, user["id"], active_only=active_only)


@router.post("/", response_model=DebtResponse, status_code=201)
async def add_debt(
    data: DebtCreate, user: CurrentUser, sb: SupabaseClient
) -> dict:
    row = data.model_dump()
    row["start_date"] = row["start_date"].isoformat()
    if row.get("end_date"):
        row["end_date"] = row["end_date"].isoformat()
    return await create_debt(sb, user["id"], row)


@router.patch("/{debt_id}", response_model=DebtResponse)
async def patch_debt(
    debt_id: str, data: DebtUpdate, user: CurrentUser, sb: SupabaseClient
) -> dict:
    return await update_debt(
        sb, user["id"], debt_id, data.model_dump(exclude_unset=True)
    )
