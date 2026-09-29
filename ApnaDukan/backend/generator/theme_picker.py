# theme_picker.py
# This file decides which HTML theme template to use based on the shop type.
# Food shops get a warm food theme, clothing shops get a fashion theme, etc.

import os


# Maps each shop type to its HTML template filename
THEME_MAP = {
    "food": "theme_food.html",
    "clothing": "theme_clothing.html",
    "services": "theme_services.html",
    "general": "theme_general.html"
}

# Color schemes for each theme type (used in SEO and meta tags)
THEME_COLORS = {
    "food": "#E65100",       # Deep orange — appetite-stimulating
    "clothing": "#6A1B9A",   # Purple — fashion and elegance
    "services": "#1565C0",   # Blue — trust and professionalism
    "general": "#2E7D32"     # Green — friendly and open
}

# Emoji icons for each theme (used in page titles and taglines)
THEME_ICONS = {
    "food": "🍽️",
    "clothing": "👗",
    "services": "🛠️",
    "general": "🏪"
}


def get_theme_filename(shop_type: str) -> str:
    """
    Returns the template filename for a given shop type.

    Args:
        shop_type: One of "food", "clothing", "services", "general"

    Returns:
        The HTML template filename to use.
    """
    return THEME_MAP.get(shop_type, THEME_MAP["general"])


def get_theme_path(shop_type: str) -> str:
    """
    Returns the full file path to the theme template.

    Args:
        shop_type: One of "food", "clothing", "services", "general"

    Returns:
        Full path to the theme HTML file.
    """
    filename = get_theme_filename(shop_type)
    # Themes are stored in the /templates/ folder at the project root
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    return os.path.join(base_dir, "templates", filename)


def get_theme_color(shop_type: str) -> str:
    """
    Returns the primary brand color for a given shop type.

    Args:
        shop_type: One of "food", "clothing", "services", "general"

    Returns:
        A hex color string like "#E65100"
    """
    return THEME_COLORS.get(shop_type, THEME_COLORS["general"])


def get_theme_icon(shop_type: str) -> str:
    """
    Returns the emoji icon for a given shop type.

    Args:
        shop_type: One of "food", "clothing", "services", "general"

    Returns:
        An emoji string.
    """
    return THEME_ICONS.get(shop_type, THEME_ICONS["general"])


def pick_theme(shop_data: dict) -> dict:
    """
    Master function: takes full shop data, returns all theme info in one dict.

    Args:
        shop_data: The full shop data dictionary.

    Returns:
        A dictionary with theme_file, theme_path, color, and icon.
    """
    shop_type = shop_data.get("shop_type", "general")

    return {
        "shop_type": shop_type,
        "theme_file": get_theme_filename(shop_type),
        "theme_path": get_theme_path(shop_type),
        "color": get_theme_color(shop_type),
        "icon": get_theme_icon(shop_type)
    }
