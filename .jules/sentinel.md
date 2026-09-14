## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).
## 2026-09-14 - [CRITICAL] Hardcoded JWT Secret Key
**Vulnerability:** A hardcoded JWT secret key was found in `config.yaml` and loaded by `backend/config.py`, making the secret visible in version control.
**Learning:** Configuration files tracked by version control should never store secrets directly. Instead, they should require these secrets to be provided at runtime via environment variables to ensure secure execution environments.
**Prevention:** Utilize environment variables for all sensitive keys and enforce their presence during application startup to fail fast if they are missing.
