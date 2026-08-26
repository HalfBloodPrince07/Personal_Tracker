## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2025-05-27 - Hardcoded JWT Secret Key in Configuration File
**Vulnerability:** The `JWT_SECRET_KEY` used for generating and verifying authentication tokens was hardcoded in `config.yaml` and loaded without a way to securely override it via environment variables in production.
**Learning:** Hardcoding sensitive configuration like JWT secrets in source-controlled files creates a critical risk if the repository or codebase is ever exposed.
**Prevention:** Ensure that all sensitive configuration, including secret keys and API keys, are designed to securely load or allow overriding from secure environment variables rather than hardcoded configuration files.
