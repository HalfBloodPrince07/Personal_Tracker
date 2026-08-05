## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2026-08-05 - [CRITICAL] Fix Hardcoded Secrets Override
**Vulnerability:** The application was hardcoding its JWT secret key within the `config.yaml` file, creating a major security risk for unauthorized access.
**Learning:** It existed because `backend/config.py` did not check the environment for a secure override of the `JWT_SECRET_KEY`, loading the YAML strictly.
**Prevention:** Always allow security-sensitive keys to be fetched from the runtime environment via `os.environ.get()` instead of statically relying on configuration files, and avoid committing real secrets into the repository.