## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2026-09-02 - Hardcoded JWT Secret Key in Configuration
**Vulnerability:** The JWT authentication secret key was hardcoded in `config.yaml` and loaded directly without allowing for environment variable overrides in `backend/config.py`.
**Learning:** Hardcoding sensitive configuration values (like JWT secret keys) within the source code or configuration files poses a severe security risk, especially in production environments where they should be securely injected (e.g. via environment variables or secret managers) to prevent unauthorized token generation.
**Prevention:** Ensure all sensitive configuration parameters can be overridden using environment variables and are properly documented. Use `.env` files for local development and secure secrets management platforms in production.
