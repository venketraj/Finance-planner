from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Finance Planner API", version="0.1.0")

import os

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    os.getenv("FRONTEND_URL", ""),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in ALLOWED_ORIGINS if o],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
from app.routers import auth, profiles, transactions, holdings, debts, portfolio, fire, dashboard, cas_import, alerts, family, export_data, excel_import, market, watchlist

app.include_router(auth.router)
app.include_router(profiles.router)
app.include_router(transactions.router)
app.include_router(holdings.router)
app.include_router(excel_import.router)
app.include_router(cas_import.router)
app.include_router(debts.router)
app.include_router(portfolio.router)
app.include_router(fire.router)
app.include_router(dashboard.router)
app.include_router(alerts.router)
app.include_router(family.router)
app.include_router(export_data.router)
app.include_router(market.router)
app.include_router(watchlist.router)
