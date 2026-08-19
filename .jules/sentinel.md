## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2025-02-27 - Hardcoded JWT Secret Key in Configuration
**Vulnerability:** The application used a hardcoded `secret_key` in `config.yaml` for JWT authentication without providing a way to securely override it using environment variables.
**Learning:** Hardcoded secrets in configuration files that are checked into version control can easily be exposed, making the application vulnerable to token forgery attacks.
**Prevention:** Always allow overriding sensitive configuration values with environment variables in `backend/config.py` to ensure secrets can be securely injected in production environments.
