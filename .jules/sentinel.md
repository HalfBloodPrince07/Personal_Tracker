## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2026-09-17 - Hardcoded JWT Secret Key in Configuration
**Vulnerability:** The JWT secret key used for authentication was hardcoded in `config.yaml` (`plis-super-secret-key-change-in-production-2024`) and loaded via `backend/config.py`.
**Learning:** Hardcoding sensitive secrets like JWT signing keys directly in configuration files exposes the application to severe authentication bypass and privilege escalation if the configuration file is leaked or committed to version control.
**Prevention:** Always rely on secure environment variables for sensitive secrets. Ensure the application fails fast during startup if critical secrets like `JWT_SECRET_KEY` are not provided, preventing insecure default states.
