from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str

    # Scheduler
    sync_cron_hour: int = 2
    sync_cron_minute: int = 0
    sync_semaphore_limit: int = 5

    # Financial defaults
    default_inflation_rate: float = 0.06
    default_expected_return: float = 0.12
    default_swr: float = 0.04

    model_config = {"env_file": ".env"}


settings = Settings()
