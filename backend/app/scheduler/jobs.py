# Scheduler reserved for future jobs. Market sync has been removed —
# portfolio values come directly from uploaded PDFs and require no background fetching.

_scheduler = None


async def start_scheduler():
    return None


def stop_scheduler(scheduler) -> None:
    pass
