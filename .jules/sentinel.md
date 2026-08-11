## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).
## 2024-08-11 - [Hardcoded JWT Secret Key Override]
**Vulnerability:** The application relied on a hardcoded `secret_key` for JWT authentication in `config.yaml`, without a way to override it securely via environment variables.
**Learning:** Configurations shouldn't be the sole source of truth for sensitive credentials. An environment variable override mechanism should be in place to prevent accidental exposure of secrets when configurations are checked into version control.
**Prevention:** Implement an environment variable override for sensitive configuration values (like `JWT_SECRET_KEY`) early in the configuration loading pipeline to ensure production environments do not use default hardcoded keys.
