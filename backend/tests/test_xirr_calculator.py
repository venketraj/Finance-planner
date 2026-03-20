"""Tests for the XIRR calculator."""

from datetime import date

from app.services.xirr_calculator import compute_xirr, compute_holding_xirr


class TestComputeXirr:
    def test_simple_return(self):
        """Invest 100k, get 112k after 1 year ≈ 12% return."""
        dates = [date(2020, 1, 1), date(2021, 1, 1)]
        amounts = [-100000, 112000]
        result = compute_xirr(dates, amounts)

        assert result is not None
        assert abs(result - 0.12) < 0.01

    def test_sip_pattern(self):
        """Monthly SIP of 10k for 12 months, final value 135k."""
        dates = [date(2023, i, 1) for i in range(1, 13)]
        amounts = [-10000] * 12
        dates.append(date(2024, 1, 1))
        amounts.append(135000)

        result = compute_xirr(dates, amounts)
        assert result is not None
        assert result > 0  # Should be a positive return

    def test_loss_scenario(self):
        """Invest 100k, value drops to 80k after 1 year."""
        dates = [date(2023, 1, 1), date(2024, 1, 1)]
        amounts = [-100000, 80000]
        result = compute_xirr(dates, amounts)

        assert result is not None
        assert result < 0  # Negative return

    def test_insufficient_data(self):
        """Should return None with fewer than 2 data points."""
        assert compute_xirr([date(2024, 1, 1)], [-10000]) is None
        assert compute_xirr([], []) is None

    def test_mismatched_lengths(self):
        """Should return None with mismatched dates and amounts."""
        dates = [date(2024, 1, 1), date(2024, 6, 1)]
        amounts = [-10000]
        assert compute_xirr(dates, amounts) is None

    def test_multi_year_investment(self):
        """3-year investment with 15% CAGR."""
        dates = [date(2021, 1, 1), date(2024, 1, 1)]
        amounts = [-100000, 152087.5]  # 100000 * 1.15^3
        result = compute_xirr(dates, amounts)

        assert result is not None
        assert abs(result - 0.15) < 0.01


class TestComputeHoldingXirr:
    def test_simple_holding(self):
        result = compute_holding_xirr(
            purchase_date=date(2022, 1, 1),
            purchase_amount=100000,
            current_date=date(2024, 1, 1),
            current_value=140000,
        )

        assert result is not None
        assert 0.15 < result < 0.25  # ~18-20% annualized

    def test_with_intermediate_cashflows(self):
        """Holding with an additional purchase (SIP-like)."""
        result = compute_holding_xirr(
            purchase_date=date(2022, 1, 1),
            purchase_amount=100000,
            current_date=date(2024, 1, 1),
            current_value=280000,
            intermediate_cashflows=[
                (date(2023, 1, 1), -100000),  # Additional purchase
            ],
        )

        assert result is not None
        assert result > 0  # Should be positive return
