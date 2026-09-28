## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2026-09-28 - Hardcoded JWT Secret Key in Configuration
**Vulnerability:** The JWT secret key (`plis-super-secret-key-change-in-production-2024`) was hardcoded directly in `config.yaml` and committed to version control. This compromises all current and future tokens generated if the repository is leaked or accessed by unauthorized individuals.
**Learning:** Hardcoding sensitive configuration values creates immediate security risks and makes credential rotation extremely difficult. Storing secrets in plain text files within the repository violates secure credential management practices.
**Prevention:** Remove hardcoded secrets from configuration files and enforce loading them exclusively from the environment (e.g., via `os.environ.get("JWT_SECRET_KEY")`). Ensure the application fails to start if critical security configurations are missing, promoting fail-fast behavior and preventing deployment with default or missing credentials.
