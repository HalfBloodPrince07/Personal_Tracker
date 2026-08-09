## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2026-08-09 - Hardcoded JWT Secret Key in Configuration
**Vulnerability:** The `JWT_SECRET_KEY` was hardcoded in `config.yaml` and the application did not allow overriding it securely via environment variables.
**Learning:** Hardcoding secrets in configuration files can easily lead to credential leaks if the config file is committed to version control. Configuration loaders must prioritize secure environment variables over static files.
**Prevention:** Always support environment variable overrides for sensitive configuration values like secret keys, API tokens, and database credentials during the configuration loading phase.
