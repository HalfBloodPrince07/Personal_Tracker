## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2024-10-01 - Hardcoded JWT Secret Key in Configuration
**Vulnerability:** A hardcoded secret key for JWT authentication (`plis-super-secret-key-change-in-production-2024`) was found in `config.yaml`.
**Learning:** Hardcoding secrets in configuration files that are checked into version control is a critical security vulnerability, as it exposes the keys to anyone with access to the repository, potentially allowing attackers to forge authentication tokens.
**Prevention:** Never commit secrets to the repository. Always use environment variables to manage sensitive configuration data in production environments. Enforce the presence of these environment variables at application startup, failing fast if they are missing to prevent insecure defaults.
