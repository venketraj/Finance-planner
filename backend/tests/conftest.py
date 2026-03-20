import pytest
from unittest.mock import AsyncMock, MagicMock


@pytest.fixture
def mock_supabase():
    """Mock Supabase async client for unit tests."""
    client = AsyncMock()

    # Configure chainable table().select().eq().execute() pattern
    table_mock = MagicMock()
    client.table.return_value = table_mock
    table_mock.select.return_value = table_mock
    table_mock.insert.return_value = table_mock
    table_mock.update.return_value = table_mock
    table_mock.delete.return_value = table_mock
    table_mock.upsert.return_value = table_mock
    table_mock.eq.return_value = table_mock
    table_mock.neq.return_value = table_mock
    table_mock.gte.return_value = table_mock
    table_mock.lte.return_value = table_mock
    table_mock.order.return_value = table_mock
    table_mock.range.return_value = table_mock
    table_mock.execute = AsyncMock(return_value=MagicMock(data=[]))

    return client


@pytest.fixture
def sample_profile():
    return {
        "id": "test-user-uuid",
        "full_name": "Test User",
        "monthly_income": 150000,
        "monthly_expenses": 60000,
        "current_age": 30,
        "retirement_age": 50,
        "life_expectancy": 85,
        "safe_withdrawal_rate": 0.04,
        "expected_inflation": 0.06,
        "expected_return": 0.12,
        "fire_target_annual_expense": None,
        "currency": "INR",
    }


@pytest.fixture
def sample_holdings():
    return [
        {
            "id": "h1",
            "user_id": "test-user-uuid",
            "asset_type": "stock",
            "ticker": "RELIANCE.NS",
            "name": "Reliance Industries",
            "units": 10,
            "purchase_price": 2500.0,
            "purchase_date": "2023-01-15",
            "is_active": True,
        },
        {
            "id": "h2",
            "user_id": "test-user-uuid",
            "asset_type": "mutual_fund",
            "ticker": "119598",
            "name": "Axis Bluechip Fund",
            "units": 500,
            "purchase_price": 45.0,
            "purchase_date": "2023-06-01",
            "is_active": True,
        },
    ]


@pytest.fixture
def sample_debts():
    return [
        {
            "id": "d1",
            "user_id": "test-user-uuid",
            "name": "Home Loan",
            "principal": 5000000,
            "outstanding_balance": 4500000,
            "interest_rate": 0.085,
            "emi_amount": 45000,
            "start_date": "2022-01-01",
            "is_active": True,
        },
    ]
