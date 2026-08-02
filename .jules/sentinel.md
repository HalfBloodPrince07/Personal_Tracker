## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2026-08-02 - Hardcoded JWT Secret Key in Configuration
**Vulnerability:** The JWT secret key used for authentication was hardcoded in `config.yaml` and loaded directly without any mechanism to override it with a secure environment variable in production.
**Learning:** Hardcoding secrets in configuration files that are committed to version control exposes the application to severe security risks, allowing attackers to forge JWT tokens and bypass authentication.
**Prevention:** Always use environment variables for sensitive configuration values like secret keys. Provide a mechanism in the configuration loader to prioritize environment variables over hardcoded defaults.
