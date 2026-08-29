## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2024-05-24 - Hardcoded Secret Key in configuration
**Vulnerability:** The JWT secret key was hardcoded in `config.yaml` and loaded directly in `backend/config.py` without supporting environment variable overrides.
**Learning:** Hardcoding sensitive secrets like JWT signing keys directly into configuration files or version control makes it highly likely they will be leaked in production.
**Prevention:** Support injecting secrets via environment variables in configuration loaders. Use a pattern that safely falls back to defaults or explicit overrides, preferring `os.environ` for production deployments.
