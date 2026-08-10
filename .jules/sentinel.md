## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2024-05-24 - Hardcoded JWT Secret Key in Configuration
**Vulnerability:** The JWT authentication `secret_key` was hardcoded in `config.yaml` as "plis-super-secret-key-change-in-production-2024". This makes it trivial for anyone with access to the source code to forge valid JWT tokens and impersonate any user.
**Learning:** Default fallback credentials are often left in production configurations if environment variables are not enforced.
**Prevention:** Never hardcode secrets in source code or default configuration files. Ensure that application configuration dynamically pulls sensitive variables from the environment and preferably fails to start if essential secrets are missing or use default values that are obviously placeholders.
