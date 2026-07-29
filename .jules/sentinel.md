## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2026-07-29 - Hardcoded JWT Secret in Configuration
**Vulnerability:** A hardcoded `secret_key` ("plis-super-secret-key-change-in-production-2024") was present in `config.yaml` and loaded unconditionally in `backend/config.py`, making it vulnerable to exposure if the codebase is shared or public.
**Learning:** Hardcoding secrets in configuration files that are committed to version control is a critical security risk. Environment variables must be prioritized as the primary mechanism for overriding secrets in code.
**Prevention:** Always read sensitive configuration items, such as JWT secret keys, API keys, and passwords, from environment variables (e.g., `os.environ.get("JWT_SECRET_KEY")`). Do not hardcode these in files that are committed to Git.
