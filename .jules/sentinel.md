## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2024-11-04 - Hardcoded JWT Secret Key in Configuration
**Vulnerability:** The application's `JWT_SECRET_KEY` was hardcoded in plaintext within `config.yaml` and loaded blindly by `backend/config.py`.
**Learning:** Hardcoding secrets directly in version-controlled configuration files exposes critical cryptographic keys to anyone with repository access. This pattern completely undermines the security of JWT authentication since an attacker can forge tokens.
**Prevention:** Never hardcode secrets in source code or configuration files. Use environment variables to inject sensitive data at runtime and enforce their presence (e.g., failing fast during application startup if they are missing).
