## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).
## 2024-05-24 - Hardcoded Secret Key in config.yaml
**Vulnerability:** A hardcoded secret key was present in the `config.yaml` file (`plis-super-secret-key-change-in-production-2024`), creating a high-severity security risk for production environments.
**Learning:** Hardcoded credentials should never be checked into version control. Even if intended for local development, they pose a significant risk if deployed inadvertently.
**Prevention:** Use placeholder values in configuration files (e.g., `CHANGE_ME_IN_PRODUCTION`) and allow the application to securely load sensitive credentials from environment variables (e.g., `os.getenv("JWT_SECRET_KEY")`).
