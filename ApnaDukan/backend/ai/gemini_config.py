# gemini_config.py
# Controls which Gemini model ApnaDukan uses.
#
# We use the "gemini-flash-latest" alias: Google keeps it pointed at the newest Flash
# release, so you never have to edit a model name. (Google emails a 2-week notice
# before the alias moves to a new version.)
#
# Different Flash generations want different "thinking" settings:
#   • newer Flash (3.x, what the alias points to now)  -> thinkingLevel: "low"
#   • older Flash (2.x)                                -> thinkingBudget: 0
# post_gemini() below tries the right one first and automatically falls back if the
# API rejects it, so the app keeps working even when the alias moves to a new version.
#
# Override the model in backend/.env with:  GEMINI_MODEL=some-other-model

import os
import requests

DEFAULT_MODEL = "gemini-flash-latest"

_working_thinking = None  # remembers which thinking style the API accepted


def get_model() -> str:
    return (os.environ.get("GEMINI_MODEL") or DEFAULT_MODEL).strip()


def gemini_url(api_key: str) -> str:
    return (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{get_model()}:generateContent?key={api_key}"
    )


def _thinking_variants() -> list:
    """Thinking settings to try, best first. None = send no thinkingConfig at all."""
    if get_model().startswith("gemini-2"):
        return [{"thinkingBudget": 0}, None]
    return [{"thinkingLevel": "low"}, {"thinkingBudget": 0}, None]


def generation_config(max_tokens: int) -> dict:
    """Builds the generationConfig block (headroom left for thinking tokens)."""
    cfg = {"maxOutputTokens": max_tokens + 1024}
    thinking = _working_thinking or _thinking_variants()[0]
    if thinking:
        cfg["thinkingConfig"] = thinking
    return cfg


def post_gemini(url: str, payload: dict, timeout: int = 30) -> requests.Response:
    """
    POSTs to Gemini. If the API rejects the thinking setting (400), retries with the
    next compatible style and remembers what worked.
    """
    global _working_thinking
    variants = [_working_thinking] if _working_thinking else _thinking_variants()
    resp = None
    for thinking in variants:
        cfg = payload.setdefault("generationConfig", {})
        cfg.pop("thinkingConfig", None)
        if thinking:
            cfg["thinkingConfig"] = thinking
        resp = requests.post(url, json=payload, timeout=timeout)
        if resp.status_code == 400 and "think" in resp.text.lower():
            continue  # wrong thinking style for this model version -> try next
        if resp.status_code == 200:
            _working_thinking = thinking
        return resp
    return resp


def extract_text(result: dict) -> str:
    """Safely pulls the answer text out of a Gemini response."""
    candidates = result.get("candidates") or []
    if not candidates:
        raise Exception(f"Gemini returned no answer: {str(result)[:300]}")
    parts = (candidates[0].get("content") or {}).get("parts") or []
    text = "".join(p.get("text", "") for p in parts if not p.get("thought"))
    if not text.strip():
        reason = candidates[0].get("finishReason", "unknown")
        raise Exception(f"Gemini returned empty text (finishReason: {reason})")
    return text.strip()
