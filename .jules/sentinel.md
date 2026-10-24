## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2024-10-24 - Hardcoded JWT Secret Key in Configuration
**Vulnerability:** The JWT secret key used for authentication was hardcoded directly in `config.yaml` as plain text. Anyone with read access to the repository could extract it and potentially forge valid JWT tokens, completely bypassing authentication.
**Learning:** Hardcoding sensitive cryptographic secrets in configuration files checked into version control is a critical security anti-pattern, particularly in monolithic configs where access to other settings (e.g., ports, model names) might be necessary for standard development.
**Prevention:** Always rely on secure environment variables or external secrets managers to inject sensitive keys at runtime. The configuration loader (`backend/config.py`) should strictly enforce the presence of these environment variables and fail fast (e.g., raising a ValueError) to prevent accidental insecure fallbacks during application startup.
