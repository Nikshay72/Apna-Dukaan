# classifier.py
# Figures out what TYPE of shop it is: food, clothing, services, or general.
# Shop type decides which website theme the owner gets.

from .extractor import _call_gemini
from .prompts import CLASSIFIER_PROMPT


def classify_shop(shop_name: str, products: list) -> str:
    """
    Sends shop name + products to Gemini to determine shop type.
    Returns one of: "food", "clothing", "services", "general"
    """
    products_text = ", ".join(products) if products else "not specified"

    shop_type = _call_gemini(
        system_prompt=CLASSIFIER_PROMPT,
        user_message=f"Shop name: {shop_name}\nProducts/Services: {products_text}",
        max_tokens=10
    ).lower().strip()

    valid_types = ["food", "clothing", "services", "general"]
    return shop_type if shop_type in valid_types else "general"


def classify_from_shop_data(shop_data: dict) -> str:
    """Convenience function — classifies directly from a shop_data dictionary."""
    # If already set, trust it
    if shop_data.get("shop_type") in ["food", "clothing", "services", "general"]:
        return shop_data["shop_type"]

    return classify_shop(
        shop_name=shop_data.get("shop_name", "My Shop"),
        products=shop_data.get("products", [])
    )
