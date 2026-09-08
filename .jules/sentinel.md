## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2026-09-08 - Hardcoded JWT Secret Key in Configuration
**Vulnerability:** A highly sensitive JWT secret key was hardcoded in `config.yaml` and loaded directly in `backend/config.py`.
**Learning:** Hardcoding secrets in configuration files that are checked into version control exposes the application to critical security risks. Anyone with read access to the repository can obtain the secret key, leading to potential authentication bypass or unauthorized access.
**Prevention:** Always use environment variables for storing sensitive information like API keys and secret keys. Fail fast during startup by raising an exception if required environment variables are not set. Ensure that configuration files checked into source control only contain empty placeholders or development default values (if acceptable).
