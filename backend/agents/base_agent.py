"""BaseAgent — shared retry loop, JSON validation and structured logging."""
import logging
from typing import Any

from backend import llm_client

logger = logging.getLogger(__name__)


class BaseAgent:
    """
    Base class for all extraction agents.

    Subclasses must override:
        - system_prompt  (str)  — system message sent to the LLM
        - parse(raw_json: dict, **ctx) -> Any  — validate / clean the parsed dict
        - store(parsed: Any, db, **ctx) -> Any — write the result to the database

    Call flow:
        result = await agent.run(user_text, db, **extra_ctx)
    """

    name: str = "BaseAgent"
    system_prompt: str = ""
    max_retries: int = 3
    enable_thinking: bool = True  # Enable deep reasoning for insight agents
    model: str = "qwen/qwen3-8b"  # Default fast model

    def _build_user_message(self, text: str, **ctx) -> str:
        """Override to augment the raw user text with context (e.g. known people list)."""
        return text

    def parse(self, raw: dict, **ctx) -> Any:
        """Validate and clean the LLM's JSON output. Raise ValueError on bad data."""
        return raw

    async def store(self, parsed: Any, db, **ctx) -> Any:
        """Write parsed data to the database. Return whatever the endpoint should return."""
        raise NotImplementedError

    async def run(self, text: str, db, **ctx) -> dict:
        """Main entry-point. Calls LLM with retries, then delegates to store()."""
        user_msg = self._build_user_message(text, **ctx)
        last_err = None

        for attempt in range(1, self.max_retries + 1):
            logger.info("[%s] LLM call attempt %d/%d", self.name, attempt, self.max_retries)
            # chat() now raises RuntimeError on connectivity/model issues — let it propagate
            raw_text = await llm_client.chat(
                self.system_prompt, user_msg,
                enable_thinking=self.enable_thinking,
                model=self.model,
            )

            parsed_json = llm_client.extract_json(raw_text)
            if parsed_json is None:
                logger.warning("[%s] Attempt %d: could not extract JSON. Raw: %s", self.name, attempt, raw_text[:300])
                last_err = f"Could not extract JSON (attempt {attempt})"
                continue

            try:
                parsed = self.parse(parsed_json, **ctx)
            except ValueError as e:
                logger.warning("[%s] Attempt %d: parse validation failed: %s", self.name, attempt, e)
                last_err = str(e)
                continue

            logger.info("[%s] Parsed successfully on attempt %d", self.name, attempt)
            result = await self.store(parsed, db, **ctx)
            return {"agent": self.name, "attempt": attempt, "parsed": parsed_json, **result}

        raise ValueError(f"[{self.name}] Extraction failed after {self.max_retries} attempts. Last error: {last_err}")
