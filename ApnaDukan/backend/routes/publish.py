# publish.py (routes)
# This Flask route deploys the generated HTML to Vercel so the shop gets a live URL.
# It uses the Vercel API to create a new deployment with the shop's HTML file.

import os
import json
import base64
import requests
from flask import Blueprint, request, jsonify, session
from database.db import save_shop, get_shop_by_id, update_shop_url

publish_bp = Blueprint("publish", __name__)


@publish_bp.route("/api/publish", methods=["POST"])
def publish_site():
    """
    Publishes the generated website to Vercel and returns the live URL.

    Request JSON (optional): { "shop_id": "uuid" }
    Response JSON: { "success": true, "url": "https://sharma-store.vercel.app", "shop_id": "uuid" }
    """
    data = request.get_json() or {}
    shop_id = data.get("shop_id") or session.get("shop_id")

    if not shop_id:
        return jsonify({"error": "No shop ID found. Please generate the site first."}), 400

    # Fetch shop data from database
    shop = get_shop_by_id(shop_id)
    if not shop:
        return jsonify({"error": "Shop not found in database."}), 404

    html_content = shop.get("site_html")
    if not html_content:
        return jsonify({"error": "No HTML found. Please generate the site first."}), 400

    shop_name = shop.get("shop_name", "my-shop")

    try:
        # Deploy to Vercel — or, if no (working) Vercel token, use the local preview link
        local = False
        token = (os.environ.get("VERCEL_TOKEN") or "").strip().lower()
        if not token or token.startswith("your"):
            local = True
        else:
            try:
                live_url = _deploy_to_vercel(shop_id, shop_name, html_content)
            except Exception as ve:
                print(f"  [publish] Vercel deploy failed ({ve}) -> using local preview link.")
                local = True
        if local:
            live_url = request.host_url.rstrip("/") + f"/preview/{shop_id}"

        # Save the URL to database
        update_shop_url(shop_id, live_url)

        # Update session
        session["live_url"] = live_url

        return jsonify({
            "success": True,
            "url": live_url,
            "shop_id": shop_id,
            "shop_name": shop_name,
            "local": local,
            "message": f"🎉 Aapki dukaan live ho gayi! Visit karein: {live_url}"
        })

    except Exception as e:
        return jsonify({"error": f"Publishing failed: {str(e)}"}), 500


def _deploy_to_vercel(shop_id: str, shop_name: str, html_content: str) -> str:
    """
    Uses the Vercel API to deploy a single HTML file as a new project.

    Args:
        shop_id: Unique shop identifier (used in the project name).
        shop_name: The shop's name (used in the URL slug).
        html_content: The complete HTML string to deploy.

    Returns:
        The live URL of the deployed site.
    """
    vercel_token = os.environ.get("VERCEL_TOKEN")
    if not vercel_token:
        raise ValueError("VERCEL_TOKEN not found in environment variables.")

    # Create a URL-safe slug from the shop name
    slug = _make_slug(shop_name)
    project_name = f"apnadukan-{slug}-{shop_id[:8]}"

    # Encode HTML as base64 for the Vercel API
    html_bytes = html_content.encode("utf-8")
    html_b64 = base64.b64encode(html_bytes).decode("utf-8")

    # Vercel Deployments API payload
    payload = {
        "name": project_name,
        "files": [
            {
                "file": "index.html",
                "data": html_b64,
                "encoding": "base64"
            }
        ],
        "projectSettings": {
            "framework": None  # Static HTML — no framework needed
        },
        "target": "production"
    }

    headers = {
        "Authorization": f"Bearer {vercel_token}",
        "Content-Type": "application/json"
    }

    response = requests.post(
        "https://api.vercel.com/v13/deployments",
        headers=headers,
        json=payload,
        timeout=60
    )

    if response.status_code not in [200, 201]:
        raise Exception(f"Vercel API error {response.status_code}: {response.text}")

    result = response.json()

    # Extract the deployment URL
    url = result.get("url")
    if not url:
        raise Exception("Vercel did not return a deployment URL.")

    # Vercel URLs don't include https:// prefix
    return f"https://{url}"


def _make_slug(name: str) -> str:
    """
    Converts a shop name into a URL-safe slug.
    Example: "Sharma General Store" → "sharma-general-store"

    Args:
        name: The raw shop name string.

    Returns:
        A lowercase, hyphen-separated slug string.
    """
    import re
    slug = name.lower().strip()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)  # Remove special characters
    slug = re.sub(r'\s+', '-', slug)            # Replace spaces with hyphens
    slug = re.sub(r'-+', '-', slug)             # Remove duplicate hyphens
    slug = slug[:40]                             # Limit length
    return slug or "my-shop"


@publish_bp.route("/api/publish/status/<shop_id>", methods=["GET"])
def publish_status(shop_id: str):
    """
    Returns the published URL for a shop, if it exists.

    Response JSON: { "published": true, "url": "https://..." } or { "published": false }
    """
    try:
        shop = get_shop_by_id(shop_id)
        if shop and shop.get("site_url"):
            return jsonify({"published": True, "url": shop["site_url"]})
        return jsonify({"published": False})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
