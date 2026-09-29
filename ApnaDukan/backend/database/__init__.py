# db.py re-export for backend imports
# Routes in backend/routes/ import from backend.database.db
# This file makes that path work correctly.

from database.db import save_shop, get_shop_by_id, update_shop_url, get_all_shops, record_site_view

__all__ = ["save_shop", "get_shop_by_id", "update_shop_url", "get_all_shops", "record_site_view"]
