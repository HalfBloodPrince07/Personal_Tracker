## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2024-05-24 - Hardcoded JWT Secret Key
**Vulnerability:** A hardcoded JWT secret key (`plis-super-secret-key-change-in-production-2024`) was present in `config.yaml`.
**Learning:** Hardcoded secrets in configuration files that are checked into version control can easily be exposed if the repository is public or inadvertently leaked.
**Prevention:** Always use environment variables for sensitive configuration values like secret keys, passwords, and API tokens. Fail fast on startup if these variables are missing to ensure the application isn't run securely.
