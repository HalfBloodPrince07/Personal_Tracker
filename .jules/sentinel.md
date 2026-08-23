## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2024-05-24 - Hardcoded Secret Key in Configuration
**Vulnerability:** A hardcoded JWT secret key (`plis-super-secret-key-change-in-production-2024`) was found in `config.yaml`, presenting a critical risk if deployed to production without being changed, as it would allow attackers to forge valid JWT tokens and bypass authentication entirely.
**Learning:** Default configuration files often include placeholder secrets. Relying on operators to manually change these before deployment is insecure and error-prone.
**Prevention:** Introduce a mechanism to override configuration values via environment variables, such as `JWT_SECRET_KEY`, enabling secure injection of secrets at runtime in deployed environments without altering the source code.
