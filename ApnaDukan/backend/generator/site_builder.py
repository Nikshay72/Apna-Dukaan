# site_builder.py
# This is the core of ApnaDukan — it takes shop data and builds a complete HTML website.
# It reads the right theme template, fills in all the shop's info, and returns ready HTML.

import os
from .theme_picker import pick_theme, get_theme_color, get_theme_icon
from .seo_generator import generate_seo_tags


def build_site(shop_data: dict) -> str:
    """
    Master function: takes shop data and returns a complete, ready-to-publish HTML page.

    Args:
        shop_data: The full shop data dictionary.

    Returns:
        A complete HTML string for the shop's website.
    """
    # Step 1: Pick the right theme
    theme_info = pick_theme(shop_data)

    # Step 2: Generate SEO tags
    seo_html = generate_seo_tags(shop_data)

    # Step 3: Read the theme HTML template
    theme_path = theme_info["theme_path"]
    try:
        with open(theme_path, "r", encoding="utf-8") as f:
            template = f.read()
    except FileNotFoundError:
        # Fallback: use a minimal inline template if file not found
        template = _get_fallback_template()

    # Step 4: Prepare all the values to inject into the template
    shop_name = shop_data.get("shop_name", "My Shop")
    tagline = shop_data.get("tagline", "Welcome to our shop!")
    products = shop_data.get("products", [])
    opening_time = shop_data.get("opening_time", "9:00 AM")
    closing_time = shop_data.get("closing_time", "9:00 PM")
    open_days = shop_data.get("open_days", "Monday to Saturday")
    location = shop_data.get("location", "India")
    phone = shop_data.get("phone", "")
    extra_info = shop_data.get("extra_info", "")
    theme_color = theme_info["color"]
    theme_icon = theme_info["icon"]

    # Build phone number (strip non-digits, add India code if missing)
    clean_phone = "".join(filter(str.isdigit, phone))
    if clean_phone and not clean_phone.startswith("91"):
        whatsapp_number = "91" + clean_phone
    else:
        whatsapp_number = clean_phone

    # Build products HTML cards
    products_html = _build_products_html(products, theme_color)

    # Build extra info section (only if provided)
    extra_html = f'<p class="extra-info">{extra_info}</p>' if extra_info else ""

    # Step 5: Replace all placeholders in the template
    html = template
    html = html.replace("{{SEO_TAGS}}", seo_html)
    html = html.replace("{{SHOP_NAME}}", shop_name)
    html = html.replace("{{TAGLINE}}", tagline)
    html = html.replace("{{THEME_COLOR}}", theme_color)
    html = html.replace("{{THEME_ICON}}", theme_icon)
    html = html.replace("{{PRODUCTS_HTML}}", products_html)
    html = html.replace("{{OPENING_TIME}}", opening_time)
    html = html.replace("{{CLOSING_TIME}}", closing_time)
    html = html.replace("{{OPEN_DAYS}}", open_days)
    html = html.replace("{{LOCATION}}", location)
    html = html.replace("{{PHONE}}", phone)
    html = html.replace("{{WHATSAPP_NUMBER}}", whatsapp_number)
    html = html.replace("{{EXTRA_INFO}}", extra_html)
    html = html.replace("{{YEAR}}", "2025")

    # Map embed — uses location to generate a Google Maps iframe
    location_encoded = location.replace(" ", "+").replace(",", "%2C")
    map_embed = (
        f'<iframe '
        f'src="https://maps.google.com/maps?q={location_encoded}&output=embed&z=15" '
        f'allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade">'
        f'</iframe>'
        if location and location != "Not specified"
        else '<div class="map-placeholder">Location not provided</div>'
    )
    html = html.replace("{{MAP_EMBED}}", map_embed)

    return html


def _build_products_html(products: list, color: str) -> str:
    """Renders initial text-only product cards in the Figma red style.
    The interactive products.js layer handles photo uploads on top of these."""
    if not products:
        return ""

    cards = []
    for i, product in enumerate(products):
        cards.append(f"""<div class="apd-product-card" id="apd-card-text-{i}">
            <div class="apd-card-img-wrap">
                <div class="cam-placeholder">
                    <svg class="cam-svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#CAC3B1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                        <circle cx="12" cy="13" r="4"/>
                    </svg>
                    <span class="cam-text">Add Photo</span>
                </div>
            </div>
            <div class="apd-card-name">{product}</div>
        </div>""")

    return "\n".join(cards)


def _get_fallback_template() -> str:
    """
    Returns a minimal HTML template used if the theme file is not found.
    This ensures the site always builds even if templates are missing.
    """
    return """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    {{SEO_TAGS}}
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Noto Sans', sans-serif; background: #fafafa; color: #222; }
        .hero { background: {{THEME_COLOR}}; color: white; padding: 60px 20px; text-align: center; }
        .hero h1 { font-size: 2.2rem; margin-bottom: 10px; }
        .hero p { font-size: 1.1rem; opacity: 0.9; }
        .section { padding: 40px 20px; max-width: 600px; margin: 0 auto; }
        .section h2 { font-size: 1.4rem; margin-bottom: 20px; color: {{THEME_COLOR}}; }
        .product-card { background: white; border-radius: 12px; padding: 16px; margin-bottom: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); display: flex; align-items: center; gap: 12px; }
        .product-icon { font-size: 1.5rem; }
        .product-name { font-size: 1rem; font-weight: 600; }
        .info-row { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 12px; font-size: 0.95rem; }
        .info-icon { font-size: 1.2rem; flex-shrink: 0; }
        .cta-buttons { display: flex; gap: 12px; flex-direction: column; padding: 20px; }
        .btn { display: block; text-align: center; padding: 16px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 1rem; }
        .btn-call { background: {{THEME_COLOR}}; color: white; }
        .btn-whatsapp { background: #25D366; color: white; }
        footer { text-align: center; padding: 20px; font-size: 0.8rem; color: #999; }
    </style>
</head>
<body>
    <div class="hero">
        <div style="font-size:3rem; margin-bottom:10px;">{{THEME_ICON}}</div>
        <h1>{{SHOP_NAME}}</h1>
        <p>{{TAGLINE}}</p>
    </div>
    <div class="section">
        <h2>Hamari Offerings</h2>
        {{PRODUCTS_HTML}}
    </div>
    <div class="section">
        <h2>Shop Info</h2>
        <div class="info-row"><span class="info-icon">🕐</span><span>{{OPENING_TIME}} – {{CLOSING_TIME}}</span></div>
        <div class="info-row"><span class="info-icon">📅</span><span>{{OPEN_DAYS}}</span></div>
        <div class="info-row"><span class="info-icon">📍</span><span>{{LOCATION}}</span></div>
        <div class="info-row"><span class="info-icon">📞</span><span>{{PHONE}}</span></div>
        {{EXTRA_INFO}}
    </div>
    <div class="cta-buttons">
        <a href="tel:{{PHONE}}" class="btn btn-call">📞 Call Now</a>
        <a href="https://wa.me/{{WHATSAPP_NUMBER}}" class="btn btn-whatsapp">💬 WhatsApp Us</a>
    </div>
    <footer>
        <p>Made with ❤️ by ApnaDukan | © {{YEAR}} {{SHOP_NAME}}</p>
    </footer>
</body>
</html>"""
