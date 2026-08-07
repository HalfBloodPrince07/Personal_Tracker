## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2024-05-25 - Hardcoded JWT Secret Key in Configuration
**Vulnerability:** The application's core configuration (`config.yaml`) contained a hardcoded JWT secret key that was loaded unconditionally by `backend/config.py`.
**Learning:** Storing secrets directly in configuration files (even if intended for development) creates a high risk of accidental exposure if the code is deployed to production without modifications. It violates the 12-factor app principles regarding secret management.
**Prevention:** Application configuration should always allow for environment variables to securely override sensitive settings. In `backend/config.py`, we added logic to check for the `JWT_SECRET_KEY` environment variable and override the `config.yaml` default.
