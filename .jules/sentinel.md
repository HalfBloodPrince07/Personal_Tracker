## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2026-09-09 - Hardcoded JWT Secret Key in Configuration
**Vulnerability:** The application used a hardcoded, static JWT secret key (`plis-super-secret-key-change-in-production-2024`) in `config.yaml` that was committed to the repository.
**Learning:** Default configuration files containing sensitive secrets can easily make it into production or be exposed in public repositories. Relying on developers to "change in production" is insecure by default.
**Prevention:** Strictly enforce that sensitive secrets are provided via environment variables (e.g., `JWT_SECRET_KEY`). Fail fast at startup if critical secrets are missing rather than falling back to insecure defaults.
