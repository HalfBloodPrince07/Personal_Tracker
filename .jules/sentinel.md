## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2024-05-24 - Hardcoded JWT Secret Key in Configuration
**Vulnerability:** The application relied on a hardcoded JWT secret key (`plis-super-secret-key-change-in-production-2024`) in `config.yaml`, and the configuration loader (`backend/config.py`) lacked the ability to securely override this value via environment variables in production.
**Learning:** Hardcoding secrets in default configuration files without providing an override mechanism guarantees that the secret will be leaked in version control and used in production environments, leading to token forgery risks.
**Prevention:** Always provide an environment variable override mechanism for critical secrets in configuration loaders. Use placeholder values like `CHANGE_ME` in default configuration files to signal that the value must be changed.
