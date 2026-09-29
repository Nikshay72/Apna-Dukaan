import os
import requests

# Prioritized list of official Gemini models:
# Starts with fastest/latest high-efficiency models and cascades down to standard fallbacks.
CANDIDATE_MODELS = [
    # Top Tier: Ultra-fast & high throughput
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-2.5-flash",
    
    # Mid Tier: Stable high-performance
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-flash-latest",
    
    # Fallback Tier: High capability & stable fallbacks
    "gemini-3.1-pro-preview",
    "gemini-2.5-pro",
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
    "gemini-1.5-pro",
]

_active_model = None
_working_thinking = None


def get_model_candidates() -> list[str]:
    """Returns candidate models, prioritizing an explicit env override if set."""
    env_override = os.environ.get("GEMINI_MODEL")
    if env_override:
        return [env_override.strip().lower()]
    if _active_model:
        return [_active_model] + [m for m in CANDIDATE_MODELS if m != _active_model]
    return CANDIDATE_MODELS


def gemini_url(*args, **kwargs) -> str:
    """
    Backwards-compatible URL builder.
    Works whether called as:
      - gemini_url(api_key)
      - gemini_url(model, api_key)
      - gemini_url()
    """
    api_key = None
    model = None

    if len(args) == 1:
        api_key = args[0]
    elif len(args) >= 2:
        model = args[0]
        api_key = args[1]

    api_key = api_key or kwargs.get("api_key") or os.environ.get("GEMINI_API_KEY", "")
    model = model or kwargs.get("model") or _active_model or get_model_candidates()[0]

    return (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent?key={api_key}"
    )


def _thinking_variants(model: str) -> list:
    """Configures thinking settings based on the target generation."""
    if model.startswith("gemini-2"):
        return [{"thinkingBudget": 0}, None]
    if model.startswith("gemini-1"):
        return [None]
    return [{"thinkingLevel": "low"}, {"thinkingBudget": 0}, None]


def generation_config(max_tokens: int = 1024, model: str = None) -> dict:
    """
    Accepts:
      - generation_config(max_tokens)
      - generation_config(model, max_tokens)
    """
    if isinstance(max_tokens, str):
        model, max_tokens = max_tokens, (model if isinstance(model, int) else 1024)

    cfg = {"maxOutputTokens": max_tokens + 1024}
    active_m = model or _active_model or get_model_candidates()[0]
    thinking = _working_thinking or _thinking_variants(active_m)[0]
    if thinking:
        cfg["thinkingConfig"] = thinking
    return cfg


def post_gemini(url_or_key: str, payload: dict, timeout: int = 30) -> requests.Response:
    """
    Executes request with auto-retry across the model hierarchy.
    Compatible with post_gemini(url, payload) and post_gemini(api_key, payload).
    """
    global _active_model, _working_thinking

    # Extract API key if caller passed a full URL
    api_key = ""
    if "key=" in url_or_key:
        api_key = url_or_key.split("key=")[-1]
    elif not url_or_key.startswith("http"):
        api_key = url_or_key
    else:
        api_key = os.environ.get("GEMINI_API_KEY", "")

    last_response = None
    models_to_try = get_model_candidates()

    for model in models_to_try:
        current_url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{model}:generateContent?key={api_key}"
        )
        thinking_styles = [_working_thinking] if _working_thinking else _thinking_variants(model)

        for thinking in thinking_styles:
            cfg = payload.setdefault("generationConfig", {})
            cfg.pop("thinkingConfig", None)
            if thinking:
                cfg["thinkingConfig"] = thinking

            try:
                resp = requests.post(current_url, json=payload, timeout=timeout)
                last_response = resp

                if resp.status_code == 200:
                    _active_model = model
                    _working_thinking = thinking
                    return resp

                # If the thinking parameter was incompatible with this model, try next style
                if resp.status_code == 400 and "think" in resp.text.lower():
                    continue

                # On load / rate limits (429) or server outages (500, 502, 503, 504), cascade to next model
                if resp.status_code in (429, 500, 502, 503, 504, 404):
                    break

            except requests.RequestException:
                break

    if last_response is not None:
        return last_response

    raise RuntimeError("All candidate models failed to return a response.")


def extract_text(result: dict) -> str:
    """Safely extracts text output from the Gemini response structure."""
    candidates = result.get("candidates") or []
    if not candidates:
        raise Exception(f"Gemini returned no answer: {str(result)[:300]}")

    parts = (candidates[0].get("content") or {}).get("parts") or []
    text = "".join(p.get("text", "") for p in parts if not p.get("thought"))

    if not text.strip():
        reason = candidates[0].get("finishReason", "unknown")
        raise Exception(f"Gemini returned empty text (finishReason: {reason})")

    return text.strip()
