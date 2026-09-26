## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2024-05-25 - Hardcoded JWT Secret Key in Configuration
**Vulnerability:** A hardcoded `secret_key` for JWT token generation and validation was stored in `config.yaml` and committed to the repository, posing a critical security risk. Anyone with access to the codebase could forge authenticating tokens and impersonate any user.
**Learning:** Security-sensitive credentials like secret keys should never be committed to source code or configuration files that are checked into version control, as they can be easily exposed.
**Prevention:** Always use environment variables (e.g., `JWT_SECRET_KEY`) for sensitive credentials and enforce their presence during application startup to ensure a secure production environment.
