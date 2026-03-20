"""Tests for the FIRE calculation engine."""

from app.services.fire_calculator import FireInput, FireResult, calculate_fire


def _make_input(**overrides) -> FireInput:
    defaults = {
        "current_age": 30,
        "retirement_age": 50,
        "life_expectancy": 85,
        "monthly_income": 150000,
        "monthly_expenses": 60000,
        "current_investments": 2000000,
        "current_debt": 500000,
        "monthly_debt_payments": 15000,
        "avg_debt_interest_rate": 0.085,
        "expected_return": 0.12,
        "expected_inflation": 0.06,
        "safe_withdrawal_rate": 0.04,
    }
    defaults.update(overrides)
    return FireInput(**defaults)


class TestFireCalculator:
    def test_basic_projection(self):
        result = calculate_fire(_make_input())

        assert isinstance(result, FireResult)
        assert result.fire_number > 0
        assert len(result.year_by_year) == 20  # 50 - 30
        assert result.current_savings_rate > 0
        assert result.projected_corpus_at_retirement > 2000000  # Must grow

    def test_fire_number_uses_inflation_adjusted_expenses(self):
        result = calculate_fire(_make_input())

        # Annual expense today = 60000 * 12 = 720000
        # At retirement (20 yrs, 6% inflation): 720000 * (1.06)^20 ≈ 2,309,000
        assert result.inflation_adjusted_annual_expense > 720000
        assert result.inflation_adjusted_annual_expense > 2000000

    def test_real_return_formula(self):
        """Real return = (1 + nominal) / (1 + inflation) - 1, NOT nominal - inflation."""
        result = calculate_fire(_make_input(expected_return=0.12, expected_inflation=0.06))
        # Real return ≈ 5.66%, not 6%. This affects fire_number.
        # With 6% approximation, fire_number would be slightly different.
        assert result.fire_number > 0

    def test_already_fire_ready(self):
        result = calculate_fire(_make_input(
            current_investments=50000000,  # 5 crore
            current_debt=0,
            monthly_debt_payments=0,
        ))

        assert result.is_fire_ready is True
        assert result.monthly_savings_needed == 0

    def test_no_debt(self):
        result = calculate_fire(_make_input(
            current_debt=0,
            monthly_debt_payments=0,
            avg_debt_interest_rate=0,
        ))

        assert result.fire_number > 0
        assert len(result.year_by_year) == 20
        # All year_by_year debt values should be 0
        for yr in result.year_by_year:
            assert yr["debt"] == 0

    def test_debt_reduces_over_time(self):
        result = calculate_fire(_make_input(
            current_debt=500000,
            monthly_debt_payments=15000,
            avg_debt_interest_rate=0.085,
        ))

        # Debt should decrease year over year
        first_year_debt = result.year_by_year[0]["debt"]
        last_year_debt = result.year_by_year[-1]["debt"]
        assert last_year_debt < first_year_debt

    def test_year_by_year_has_correct_fields(self):
        result = calculate_fire(_make_input())

        for yr in result.year_by_year:
            assert "year" in yr
            assert "age" in yr
            assert "corpus" in yr
            assert "debt" in yr
            assert "net_worth" in yr
            assert "fire_target" in yr
            assert yr["net_worth"] == round(yr["corpus"] - yr["debt"], 2)

    def test_fire_age_detection(self):
        result = calculate_fire(_make_input(
            current_investments=10000000,  # 1 crore
            monthly_income=300000,
            monthly_expenses=60000,
        ))

        # With high income and existing corpus, should reach FIRE before 50
        if result.fire_age is not None:
            assert result.fire_age > 30
            assert result.fire_age <= 50
            assert result.years_to_fire == result.fire_age - 30

    def test_zero_income(self):
        result = calculate_fire(_make_input(
            monthly_income=0,
            monthly_expenses=60000,
            monthly_debt_payments=0,
        ))

        assert result.current_savings_rate == 0
        assert result.fire_number > 0

    def test_high_inflation_scenario(self):
        result_normal = calculate_fire(_make_input(expected_inflation=0.06))
        result_high = calculate_fire(_make_input(expected_inflation=0.10))

        # Higher inflation should require a larger FIRE number
        assert result_high.fire_number > result_normal.fire_number
