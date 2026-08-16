## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2026-08-16 - Hardcoded JWT Secret Key in Configuration
**Vulnerability:** The JWT secret key was hardcoded in `config.yaml`, potentially exposing it if the repository or configuration file was leaked. While it can be manually changed in production, doing so requires editing files directly.
**Learning:** Relying on configuration files for sensitive secrets without providing an environment variable override path can lead to accidental exposure or friction in secure deployments.
**Prevention:** Always allow environment variables (e.g., `JWT_SECRET_KEY`) to override configuration defaults, enabling seamless integration with secure secret managers and preventing hardcoded secrets in version control.
