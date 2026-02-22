"""Shared async LLM client — supports both LM Studio and Ollama.

Reads `llm.provider` from config.yaml to choose backend.
Both use OpenAI-compatible chat/completions endpoints.
LM Studio: auto-loads/unloads models via management API.
Ollama: always-on, no model lifecycle needed.
"""
import json
import logging
import httpx
import yaml
from pathlib import Path

logger = logging.getLogger(__name__)

# ── Load config ────────────────────────────────────────────────────────
_config_path = Path(__file__).parent.parent / "config.yaml"
with open(_config_path) as f:
    _cfg = yaml.safe_load(f)

_llm = _cfg.get("llm", {})
LLM_PROVIDER = _llm.get("provider", "lmstudio")
LLM_TEMP     = float(_llm.get("temperature", 0.3))
LLM_TOKENS   = int(_llm.get("max_tokens", 4096))

# Provider-specific config
_lm = _cfg.get("lmstudio", {})
_ol = _cfg.get("ollama", {})

if LLM_PROVIDER == "lmstudio":
    LM_BASE_URL = _lm.get("base_url", "http://localhost:1234/v1").rstrip("/")
    LM_MODEL    = _lm.get("model", "qwen3-8b")
    _mgmt_root  = LM_BASE_URL.replace("/v1", "")
elif LLM_PROVIDER == "ollama":
    LM_BASE_URL = _ol.get("base_url", "http://localhost:11434").rstrip("/") + "/v1"
    LM_MODEL    = _ol.get("model", "qwen3:8b")
    _mgmt_root  = _ol.get("base_url", "http://localhost:11434").rstrip("/")
else:
    raise ValueError(f"Unknown LLM provider: {LLM_PROVIDER}")

logger.info("[llm_client] Provider=%s  model=%s  base=%s", LLM_PROVIDER, LM_MODEL, LM_BASE_URL)

# ── Model lifecycle (LM Studio only) ─────────────────────────────────

async def _load_model(client: httpx.AsyncClient, model_name: str) -> bool:
    if LLM_PROVIDER != "lmstudio":
        return True
    try:
        resp = await client.post(
            f"{_mgmt_root}/api/v0/models/load",
            json={"model": model_name},
            timeout=60.0,
        )
        if resp.status_code in (200, 201):
            logger.info("[llm_client] Model '%s' loaded.", model_name)
            return True
        body = resp.text
        if resp.status_code in (400, 409) and (
            "already" in body.lower() or "loaded" in body.lower()
        ):
            logger.debug("[llm_client] Model '%s' already loaded.", model_name)
            return True
        logger.warning("[llm_client] Load returned %d: %s", resp.status_code, body[:200])
        return False
    except Exception as e:
        logger.warning("[llm_client] Could not load model: %s", e)
        return False


async def _unload_model(client: httpx.AsyncClient, model_name: str) -> None:
    if LLM_PROVIDER != "lmstudio":
        return
    try:
        resp = await client.post(
            f"{_mgmt_root}/api/v1/models/unload",
            json={"instance_id": model_name},
            timeout=30.0,
        )
        if resp.status_code in (200, 204):
            logger.info("[llm_client] Model '%s' unloaded.", model_name)
        else:
            logger.debug("[llm_client] Unload response %d: %s", resp.status_code, resp.text[:100])
    except Exception as e:
        logger.warning("[llm_client] Could not unload model: %s", e)


# ── Chat completion ────────────────────────────────────────────────────

async def chat(
    system: str,
    user: str,
    temperature: float = None,
    max_tokens: int = None,
    enable_thinking: bool = True,
    model: str = None,
) -> str | None:
    """Send a single-shot chat completion.

    Automatically loads the model before the call and unloads it after (LM Studio).
    Returns the assistant message string, or None if unreachable.
    Raises RuntimeError if the LLM backend is offline.

    When enable_thinking=True, the model is allowed to use its
    internal thinking/reasoning mode (produces richer analysis).
    Timeout is extended to 1200s for thinking mode.
    """
    
    selected_model = model if model else LM_MODEL
    
    payload = {
        "model": selected_model,
        "temperature": temperature if temperature is not None else LLM_TEMP,
        "max_tokens": max_tokens if max_tokens is not None else LLM_TOKENS,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
    }

    # LM Studio-specific thinking parameter formatting (v0.4.x+)
    if LLM_PROVIDER == "lmstudio":
        if enable_thinking:
            payload["thinking"] = {
                "type": "enabled",
                "reasoning_effort": "high"
            }
        else:
            payload["thinking"] = {"type": "disabled"}
    else:
        if enable_thinking:
            payload["reasoning_effort"] = "high"

    # Use longer timeout when thinking is enabled (deep reasoning takes time)
    timeout = 1200.0 if enable_thinking else 120.0

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            loaded = await _load_model(client, selected_model)
            if not loaded:
                raise RuntimeError(
                    f"LM Studio could not load model '{selected_model}'. "
                    "Check that the model identifier applies to what LM Studio has downloaded."
                )

            try:
                resp = await client.post(f"{LM_BASE_URL}/chat/completions", json=payload)

                if resp.status_code == 400:
                    body = resp.text
                    if "no models" in body.lower() or "not loaded" in body.lower():
                        raise RuntimeError(
                            f"LLM has no model loaded despite load call. Response: {body[:200]}"
                        )
                    raise RuntimeError(f"LLM returned 400: {body[:300]}")

                resp.raise_for_status()
                data    = resp.json()
                content = data["choices"][0]["message"]["content"]
                logger.debug("[llm_client] Raw LLM response (%d chars): %s", len(content), content[:200])
                return content

            finally:
                await _unload_model(client, selected_model)

    except httpx.ConnectError:
        provider_label = "LM Studio" if LLM_PROVIDER == "lmstudio" else "Ollama"
        raise RuntimeError(
            f"{provider_label} is not reachable — please ensure it is running on "
            f"{_mgmt_root} with its local server enabled."
        )
    except RuntimeError:
        raise
    except Exception as e:
        logger.error("[llm_client] Unexpected error: %s", e)
        raise RuntimeError(f"LLM error: {e}") from e


# ── JSON extraction ────────────────────────────────────────────────────

def extract_json(text: str) -> dict | list | None:
    """Extract the first JSON object or array from an LLM response string."""
    if not text:
        return None

    text = text.strip()

    # Strip qwen3 thinking blocks if present
    if "<think>" in text and "</think>" in text:
        think_end = text.rfind("</think>")
        text = text[think_end + len("</think>"):].strip()

    # Strip markdown fences
    for fence in ("```json", "```"):
        if fence in text:
            start = text.index(fence) + len(fence)
            end   = text.rindex("```") if text.count("```") > 1 else len(text)
            text  = text[start:end].strip()
            break

    # Try direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try to extract first {...} or [...]
    for opener, closer in [('{', '}'), ('[', ']')]:
        s = text.find(opener)
        e = text.rfind(closer)
        if s != -1 and e != -1 and e > s:
            try:
                return json.loads(text[s:e + 1])
            except json.JSONDecodeError:
                pass

    logger.warning("[llm_client] Could not extract JSON from: %s", text[:300])
    return None
