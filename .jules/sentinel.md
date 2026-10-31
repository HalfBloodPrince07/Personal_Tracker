## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2026-10-31 - Hardcoded JWT Secret Key in Configuration
**Vulnerability:** The JWT secret key used for signing authentication tokens was hardcoded as a plaintext string in `config.yaml` and loaded directly.
**Learning:** Hardcoding sensitive secrets like JWT signing keys directly into configuration files that are checked into version control exposes the application to critical security risks if the repository is compromised or accidentally made public.
**Prevention:** Always load sensitive secrets from environment variables (e.g., `os.environ.get("JWT_SECRET_KEY")`) and ensure they are required for the application to start (fail fast). Exclude `.env` files from version control.
