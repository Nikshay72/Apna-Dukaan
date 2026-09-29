# seo_generator.py
# Auto-generates SEO meta tags for each shop's website
# so it appears correctly on Google Search and WhatsApp link previews.

import os
import requests
from ai.gemini_config import gemini_url, generation_config, extract_text, post_gemini


def generate_seo_tags(shop_data: dict) -> str:
    """
    Calls Gemini to generate an SEO-friendly title and description,
    then returns the full HTML meta tags block to inject into the site.
    """
    shop_name   = shop_data.get("shop_name", "My Shop")
    location    = shop_data.get("location", "India")
    products    = shop_data.get("products", [])
    phone       = shop_data.get("phone", "")

    products_text = ", ".join(products[:5]) if products else "various products"

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return _fallback_seo(shop_name, location, products_text)

    try:
        url = gemini_url(api_key)

        payload = {
            "contents": [{
                "parts": [{
                    "text": f"""Generate SEO meta content for an Indian shop website. Respond ONLY with JSON, no extra text:
{{
  "title": "SEO title under 60 chars",
  "description": "Meta description under 155 chars mentioning shop, location, and what they sell"
}}

Shop name: {shop_name}
Location: {location}
Products/Services: {products_text}"""
                }]
            }],
            "generationConfig": generation_config(200)
        }

        resp = post_gemini(url, payload, timeout=15)
        if resp.status_code != 200:
            return _fallback_seo(shop_name, location, products_text)

        import json
        raw = extract_text(resp.json())
        if raw.startswith("```"):
            raw = "\n".join(raw.splitlines()[1:-1])
        seo = json.loads(raw.strip())

        title       = seo.get("title", f"{shop_name} — {location}")
        description = seo.get("description", f"Visit {shop_name} in {location}. We offer {products_text}.")

    except Exception:
        return _fallback_seo(shop_name, location, products_text)

    return f"""<title>{title}</title>
<meta name="description" content="{description}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{description}">
<meta property="og:type" content="business.business">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="{title}">
<meta name="twitter:description" content="{description}">"""


def _fallback_seo(shop_name: str, location: str, products_text: str) -> str:
    """Used when Gemini is unavailable — generates basic but correct SEO tags."""
    title       = f"{shop_name} — {location}"
    description = f"Visit {shop_name} in {location}. We offer {products_text}. Contact us today!"
    return f"""<title>{title}</title>
<meta name="description" content="{description}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{description}">
<meta property="og:type" content="business.business">"""
