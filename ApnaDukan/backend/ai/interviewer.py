# interviewer.py
# Smart interviewer — checks what info is missing and asks follow-up
# questions in friendly Hinglish until all 7 fields are collected.

import os
import json
from .prompts import INTERVIEWER_PROMPT
from .extractor import _call_gemini


def get_next_question(shop_data: dict) -> str:
    """
    Looks at current shop data, finds what's missing,
    returns ONE friendly follow-up question OR "COMPLETE".
    """
    shop_data_str = json.dumps(shop_data, ensure_ascii=False, indent=2)

    question = _call_gemini(
        system_prompt=INTERVIEWER_PROMPT,
        user_message=f"Here is the current shop data we have collected so far:\n\n{shop_data_str}\n\nWhat is the next question to ask, if any?",
        max_tokens=256
    )
    return question


def is_complete(shop_data: dict) -> bool:
    """Fast local check — no API call. True if all 7 fields are filled."""
    required_fields = [
        "shop_name", "products", "opening_time",
        "closing_time", "open_days", "location", "phone"
    ]
    for field in required_fields:
        value = shop_data.get(field)
        if value is None:
            return False
        if isinstance(value, list) and len(value) == 0:
            return False
        if isinstance(value, str) and value.strip() == "":
            return False
    return True


def get_missing_fields(shop_data: dict) -> list:
    """Returns list of field labels still missing — useful for showing progress."""
    required_fields = {
        "shop_name": "Shop Name",
        "products": "Products / Services",
        "opening_time": "Opening Time",
        "closing_time": "Closing Time",
        "open_days": "Days Open",
        "location": "Location",
        "phone": "Phone / WhatsApp Number"
    }
    missing = []
    for key, label in required_fields.items():
        value = shop_data.get(key)
        if value is None or (isinstance(value, list) and len(value) == 0) or (isinstance(value, str) and value.strip() == ""):
            missing.append(label)
    return missing
