from app.config import Settings


def test_supabase_url_trailing_slash_stripped() -> None:
    assert Settings(supabase_url="https://x.supabase.co/").supabase_url == "https://x.supabase.co"
