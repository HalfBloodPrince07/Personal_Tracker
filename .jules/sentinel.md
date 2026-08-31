## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2025-02-28 - Hardcoded JWT Secret Key in Configuration
**Vulnerability:** The JWT secret key used for authentication was hardcoded in `config.yaml` (`plis-super-secret-key-change-in-production-2024`), which was committed to the repository.
**Learning:** Storing secrets in source-controlled configuration files exposes them to anyone with repository access, risking complete compromise of the authentication system.
**Prevention:** Always externalize secrets using environment variables (e.g., `JWT_SECRET_KEY`) or secure secret management services. Configuration files should only contain non-sensitive default values or placeholders, and the application must support overriding these values at runtime securely.
