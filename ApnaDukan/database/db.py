# db.py
# This file handles all communication with the Supabase database.
# It provides simple functions to save, fetch, and update shop data.
# Think of it as the "librarian" — it knows where everything is stored.

import os
import json
from supabase import create_client, Client

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
    db = get_client()

    response = db.table("shops").select("*").eq("id", shop_id).execute()

    if response.data and len(response.data) > 0:
        return response.data[0]

    return None


def update_shop_url(shop_id: str, url: str) -> bool:
    """
    Updates the live site URL for a shop after it's published to Vercel.

    Args:
        shop_id: The UUID string of the shop.
        url: The live Vercel URL (e.g. "https://sharma-store.vercel.app")

    Returns:
        True if update succeeded, False otherwise.
    """
    db = get_client()

    response = db.table("shops").update({"site_url": url}).eq("id", shop_id).execute()

    return bool(response.data)


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
