## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2026-08-13 - Hardcoded JWT Secret Key Default Configuration
**Vulnerability:** The default configuration file relied on a hardcoded JWT secret key ('plis-super-secret-key-change-in-production-2024') which could not be overridden securely via environment variables.
**Learning:** Relying on configuration files for secrets without environment variable overrides forces developers to potentially check in sensitive data or manage complex deployment setups.
**Prevention:** Support environment variable overrides for all critical secrets (e.g., JWT_SECRET_KEY) during configuration loading, ensuring secrets can be securely injected at runtime.
