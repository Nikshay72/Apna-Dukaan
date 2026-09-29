# db.py
# This file handles all communication with the Supabase database.
# It provides simple functions to save, fetch, and update shop data.
# Think of it as the "librarian" — it knows where everything is stored.

import os
import json
import sqlite3
from supabase import create_client, Client

# ── LOCAL FALLBACK ──
# If Supabase isn't configured (or its key is rejected), shops are stored in a small
# local SQLite file instead, so the app still works with ONLY a Gemini key.
_LOCAL_DB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "local_shops.db")


def _is_placeholder(v) -> bool:
    v = (v or "").strip().lower()
    return (not v) or v.startswith("your") or "your-project" in v or "your_" in v


def supabase_configured() -> bool:
    return not (_is_placeholder(os.environ.get("SUPABASE_URL")) or _is_placeholder(os.environ.get("SUPABASE_SERVICE_KEY")))


def _warn(action: str, err: Exception):
    print(f"  [db] Supabase {action} failed ({err}) -> using local storage instead. "
          f"Fix SUPABASE_URL / SUPABASE_SERVICE_KEY in backend/.env to use Supabase.")


def _local():
    con = sqlite3.connect(_LOCAL_DB)
    con.execute("CREATE TABLE IF NOT EXISTS shops (id TEXT PRIMARY KEY, data TEXT NOT NULL)")
    return con


def _local_save(shop_data: dict) -> dict:
    con = _local()
    try:
        con.execute("INSERT INTO shops (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
                    (shop_data["id"], json.dumps(shop_data, ensure_ascii=False)))
        con.commit()
    finally:
        con.close()
    return shop_data


def _local_get(shop_id: str):
    con = _local()
    try:
        row = con.execute("SELECT data FROM shops WHERE id = ?", (shop_id,)).fetchone()
    finally:
        con.close()
    return json.loads(row[0]) if row else None

# ── SUPABASE CLIENT ──
# We create the client once and reuse it for all database calls.
_supabase_client: Client = None


def get_client() -> Client:
    """
    Returns the Supabase client. Creates it on first call (lazy initialization).
    Reads credentials from environment variables.
    """
    global _supabase_client

    if _supabase_client is None:
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_KEY")  # Use service key (not anon key) for backend

        if not url or not key:
            raise ValueError(
                "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in your .env file. "
                "Get these from: Supabase Dashboard → Your Project → Settings → API"
            )

        _supabase_client = create_client(url, key)

    return _supabase_client


# ── SAVE ──

def save_shop(shop_data: dict) -> dict:
    """
    Saves a new shop to the database (INSERT).
    If a shop with the same ID already exists, it updates it (UPSERT).

    Args:
        shop_data: The full shop data dictionary.

    Returns:
        The saved shop data from the database.
    """
    if not supabase_configured():
        return _local_save(shop_data)
    try:
        return _supabase_save(shop_data)
    except Exception as e:
        _warn("save", e)
        return _local_save(shop_data)


def _supabase_save(shop_data: dict) -> dict:
    db = get_client()

    # Convert products list to JSON (Supabase stores it as JSONB)
    record = {
        "id": shop_data.get("id"),
        "shop_name": shop_data.get("shop_name"),
        "tagline": shop_data.get("tagline"),
        "shop_type": shop_data.get("shop_type"),
        "products": shop_data.get("products", []),
        "opening_time": shop_data.get("opening_time"),
        "closing_time": shop_data.get("closing_time"),
        "open_days": shop_data.get("open_days"),
        "location": shop_data.get("location"),
        "phone": shop_data.get("phone"),
        "extra_info": shop_data.get("extra_info"),
        "site_url": shop_data.get("site_url"),
        "site_html": shop_data.get("site_html"),
    }

    # Remove None values (Supabase handles nulls, but cleaner this way)
    record = {k: v for k, v in record.items() if v is not None}

    response = db.table("shops").upsert(record).execute()

    if response.data:
        return response.data[0]
    return shop_data


def get_shop_by_id(shop_id: str) -> dict | None:
    """
    Fetches a shop from the database by its unique ID.

    Args:
        shop_id: The UUID string of the shop.

    Returns:
        The shop data dictionary, or None if not found.
    """
    local = _local_get(shop_id)
    if not supabase_configured():
        return local
    try:
        db = get_client()
        response = db.table("shops").select("*").eq("id", shop_id).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
    except Exception as e:
        _warn("read", e)
    return local


def update_shop_url(shop_id: str, url: str) -> bool:
    """
    Updates the live site URL for a shop after it's published to Vercel.

    Args:
        shop_id: The UUID string of the shop.
        url: The live Vercel URL (e.g. "https://sharma-store.vercel.app")

    Returns:
        True if update succeeded, False otherwise.
    """
    local = _local_get(shop_id)
    if local:
        local["site_url"] = url
        _local_save(local)
    if not supabase_configured():
        return bool(local)
    try:
        db = get_client()
        response = db.table("shops").update({"site_url": url}).eq("id", shop_id).execute()
        return bool(response.data) or bool(local)
    except Exception as e:
        _warn("update", e)
        return bool(local)


def get_all_shops(limit: int = 50) -> list:
    """
    Returns the most recent shops from the database.
    Used for admin dashboard (future feature).

    Args:
        limit: Maximum number of shops to return.

    Returns:
        List of shop dictionaries.
    """
    db = get_client()

    response = (
        db.table("shops")
        .select("id, shop_name, shop_type, location, site_url, created_at")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )

    return response.data or []


def record_site_view(shop_id: str, user_agent: str = "", referrer: str = "") -> None:
    """
    Records a visit to a shop's website (for analytics).
    Non-critical — errors here won't break anything.

    Args:
        shop_id: The UUID of the shop whose site was visited.
        user_agent: The visitor's browser/device info.
        referrer: Where the visitor came from.
    """
    try:
        db = get_client()
        db.table("site_views").insert({
            "shop_id": shop_id,
            "user_agent": user_agent,
            "referrer": referrer
        }).execute()
    except Exception:
        pass  # Analytics failure should never break the main app
