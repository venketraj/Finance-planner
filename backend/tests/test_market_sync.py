"""Tests for the market sync service."""

import pytest
from datetime import datetime, timezone, date
from unittest.mock import AsyncMock, patch, MagicMock

from app.services.market_sync import daily_market_sync


@pytest.mark.asyncio
async def test_skips_sync_when_no_tickers():
    """Should exit early when no active tickers exist."""
    with (
        patch("app.services.market_sync.get_supabase") as mock_get_sb,
        patch("app.services.market_sync.get_unique_active_tickers") as mock_tickers,
    ):
        mock_get_sb.return_value = AsyncMock()
        mock_tickers.return_value = []

        await daily_market_sync()

        mock_tickers.assert_called_once()


@pytest.mark.asyncio
async def test_skips_fresh_cache():
    """Tickers updated today should not be re-fetched."""
    now = datetime.now(timezone.utc)

    with (
        patch("app.services.market_sync.get_supabase") as mock_get_sb,
        patch("app.services.market_sync.get_unique_active_tickers") as mock_tickers,
        patch("app.services.market_sync.get_market_cache") as mock_cache,
        patch("app.services.market_sync.fetch_stock_data") as mock_fetch,
        patch("app.services.market_sync.compute_and_store_all_snapshots") as mock_snap,
    ):
        mock_get_sb.return_value = AsyncMock()
        mock_tickers.return_value = [{"ticker": "RELIANCE.NS", "asset_type": "stock"}]
        mock_cache.return_value = {"last_updated": now.isoformat()}
        mock_snap.return_value = None

        await daily_market_sync()

        # Should NOT call fetch_stock_data since cache is fresh
        mock_fetch.assert_not_called()


@pytest.mark.asyncio
async def test_fetches_stale_cache():
    """Tickers with stale cache should be re-fetched."""
    stale = datetime(2024, 1, 1, tzinfo=timezone.utc)

    with (
        patch("app.services.market_sync.get_supabase") as mock_get_sb,
        patch("app.services.market_sync.get_unique_active_tickers") as mock_tickers,
        patch("app.services.market_sync.get_market_cache") as mock_cache,
        patch("app.services.market_sync.fetch_stock_data") as mock_fetch,
        patch("app.services.market_sync.upsert_market_cache") as mock_upsert,
        patch("app.services.market_sync.compute_and_store_all_snapshots") as mock_snap,
    ):
        mock_get_sb.return_value = AsyncMock()
        mock_tickers.return_value = [{"ticker": "RELIANCE.NS", "asset_type": "stock"}]
        mock_cache.return_value = {"last_updated": stale.isoformat()}
        mock_fetch.return_value = {"last_price": 2800.0}
        mock_snap.return_value = None

        await daily_market_sync()

        mock_fetch.assert_called_once_with("RELIANCE.NS")
        mock_upsert.assert_called_once()


@pytest.mark.asyncio
async def test_fetches_missing_cache():
    """Tickers with no cache entry should be fetched."""
    with (
        patch("app.services.market_sync.get_supabase") as mock_get_sb,
        patch("app.services.market_sync.get_unique_active_tickers") as mock_tickers,
        patch("app.services.market_sync.get_market_cache") as mock_cache,
        patch("app.services.market_sync.fetch_mf_nav") as mock_fetch,
        patch("app.services.market_sync.upsert_market_cache") as mock_upsert,
        patch("app.services.market_sync.compute_and_store_all_snapshots") as mock_snap,
    ):
        mock_get_sb.return_value = AsyncMock()
        mock_tickers.return_value = [{"ticker": "119598", "asset_type": "mutual_fund"}]
        mock_cache.return_value = None  # No cache
        mock_fetch.return_value = {"last_price": 52.5}
        mock_snap.return_value = None

        await daily_market_sync()

        mock_fetch.assert_called_once_with("119598")
        mock_upsert.assert_called_once()


@pytest.mark.asyncio
async def test_handles_fetch_failure_gracefully():
    """A fetch failure for one ticker should not crash the entire sync."""
    stale = datetime(2024, 1, 1, tzinfo=timezone.utc)

    with (
        patch("app.services.market_sync.get_supabase") as mock_get_sb,
        patch("app.services.market_sync.get_unique_active_tickers") as mock_tickers,
        patch("app.services.market_sync.get_market_cache") as mock_cache,
        patch("app.services.market_sync.fetch_stock_data") as mock_fetch,
        patch("app.services.market_sync.upsert_market_cache") as mock_upsert,
        patch("app.services.market_sync.compute_and_store_all_snapshots") as mock_snap,
    ):
        mock_get_sb.return_value = AsyncMock()
        mock_tickers.return_value = [
            {"ticker": "FAIL.NS", "asset_type": "stock"},
            {"ticker": "OK.NS", "asset_type": "stock"},
        ]
        mock_cache.return_value = {"last_updated": stale.isoformat()}
        mock_fetch.side_effect = [Exception("API Error"), {"last_price": 100.0}]
        mock_snap.return_value = None

        # Should not raise
        await daily_market_sync()

        # Second ticker should still be cached
        assert mock_upsert.call_count == 1
