# extractor.py
# Sends the shop owner's spoken words to Gemini AI.
# Gemini extracts structured shop data (name, products, timings etc.)
# and returns it as clean JSON to build the website.

import json
import os
import requests
from .prompts import EXTRACTOR_PROMPT
from .gemini_config import gemini_url, generation_config, extract_text, post_gemini


def _call_gemini(system_prompt: str, user_message: str, max_tokens: int = 1024) -> str:
    """
    Core Gemini API caller used by all AI functions.
    Model is set in gemini_config.py (or GEMINI_MODEL in .env).
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not found in .env file.")

    url = gemini_url(api_key)

    payload = {
        "system_instruction": {
            "parts": [{"text": system_prompt}]
        },
        "contents": [
            {
                "role": "user",
                "parts": [{"text": user_message}]
            }
        ],
        "generationConfig": generation_config(max_tokens)
    }

    response = post_gemini(url, payload)

    if response.status_code != 200:
        raise Exception(f"Gemini API error: {response.status_code} — {response.text}")

    result = response.json()
    return extract_text(result)


def extract_shop_data(transcript: str) -> dict:
    """
    Takes raw spoken transcript from the shop owner,
    sends it to Gemini, returns a structured shop data dictionary.
    """
    raw_text = _call_gemini(
        system_prompt=EXTRACTOR_PROMPT,
        user_message=f"Here is what the shop owner said:\n\n{transcript}\n\nExtract the shop information and return as JSON.",
        max_tokens=1024
    )

    # Clean markdown code fences if Gemini wraps response in ```json ... ```
    if raw_text.startswith("```"):
        lines = raw_text.splitlines()
        raw_text = "\n".join(lines[1:-1])

    return json.loads(raw_text.strip())


def merge_shop_data(existing: dict, new_answer: str, question_field: str) -> dict:
    """
    Merges a new answer into existing shop data when owner answers a follow-up question.
    """
    combined_text = f"""
Previous information:
{json.dumps(existing, ensure_ascii=False, indent=2)}

New information provided for '{question_field}':
{new_answer}

Please update the shop data with this new information and return the complete updated JSON.
"""
    return extract_shop_data(combined_text)
