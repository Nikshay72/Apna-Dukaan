# generate.py (routes)
# This Flask route triggers the website generation.
# It takes the collected shop data and builds a complete HTML page.

from flask import Blueprint, request, jsonify, session
from generator.site_builder import build_site
from schema import ShopData, empty_shop
from database.db import save_shop, get_shop_by_id

generate_bp = Blueprint("generate", __name__)


@generate_bp.route("/api/generate", methods=["POST"])
def generate_site():
    """
    Generates the full HTML website from the shop data collected during the interview.
    Can use session data OR accept shop_data directly in the request body.

    Request JSON (optional): { "shop_data": {...} }
    Response JSON: { "html": "<!DOCTYPE html>...", "shop_id": "uuid", "preview_url": "/preview/uuid" }
    """
    data = request.get_json() or {}

    # Use shop_data from request body if provided, else fall back to session
    shop_data = data.get("shop_data") or session.get("shop_data")

    if not shop_data:
        return jsonify({"error": "No shop data found. Please complete the interview first."}), 400

    shop = ShopData.from_dict(shop_data)

    if not shop.is_complete():
        missing = shop_data  # pass raw dict for missing fields check
        return jsonify({
            "error": "Shop data is incomplete. Please finish the interview.",
            "completion": shop.completion_percentage()
        }), 400

    try:
        # Build the HTML
        html = build_site(shop_data)

        # Save the generated HTML to the shop object
        shop.site_html = html

        # Save to database
        shop_dict = shop.to_dict()
        save_shop(shop_dict)

        # Also update session
        session["shop_data"] = shop_dict
        session["shop_id"] = shop.id

        return jsonify({
            "success": True,
            "shop_id": shop.id,
            "shop_name": shop.shop_name,
            "html": html,
            "preview_url": f"/preview/{shop.id}"
        })

    except Exception as e:
        return jsonify({"error": f"Site generation failed: {str(e)}"}), 500


@generate_bp.route("/api/generate/preview", methods=["GET"])
def preview_site():
    """
    Returns a quick HTML preview using current session data.
    Used by the frontend to show a live preview as the interview progresses.

    Response: HTML content (not JSON)
    """
    from flask import Response
    shop_data = session.get("shop_data", empty_shop())

    # Even if data is incomplete, generate a partial preview
    try:
        # Fill in placeholders for missing fields so preview doesn't break
        preview_data = _fill_preview_defaults(shop_data)
        html = build_site(preview_data)
        return Response(html, mimetype="text/html")
    except Exception as e:
        return Response(f"<p>Preview unavailable: {str(e)}</p>", mimetype="text/html")


@generate_bp.route("/preview/<shop_id>", methods=["GET"])
def view_generated_site(shop_id):
    """
    Displays the generated HTML site for a given shop ID.
    This is the actual published site URL.

    Response: HTML content
    """
    from flask import Response
    try:
        shop = get_shop_by_id(shop_id)
        if not shop or not shop.get("site_html"):
            return Response("<h1>Site not found</h1>", mimetype="text/html", status=404)
        return Response(shop["site_html"], mimetype="text/html")
    except Exception as e:
        return Response(f"<h1>Error: {str(e)}</h1>", mimetype="text/html", status=500)


def _fill_preview_defaults(shop_data: dict) -> dict:
    """
    Fills in placeholder values for any missing fields so the preview
    always renders something meaningful, even mid-interview.
    """
    defaults = {
        "shop_name": shop_data.get("shop_name") or "Aapki Dukaan",
        "tagline": shop_data.get("tagline") or "Aapka swagat hai!",
        "shop_type": shop_data.get("shop_type") or "general",
        "products": shop_data.get("products") or ["Product 1", "Product 2", "Product 3"],
        "opening_time": shop_data.get("opening_time") or "9:00 AM",
        "closing_time": shop_data.get("closing_time") or "9:00 PM",
        "open_days": shop_data.get("open_days") or "Monday to Saturday",
        "location": shop_data.get("location") or "Aapka Sheher",
        "phone": shop_data.get("phone") or "9876543210",
        "extra_info": shop_data.get("extra_info") or "",
    }
    return defaults
