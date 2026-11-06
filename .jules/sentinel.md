## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2024-11-20 - Hardcoded JWT Secret Key in Configuration
**Vulnerability:** The JWT secret key was hardcoded in `config.yaml` and loaded unconditionally in `backend/config.py`.
**Learning:** Hardcoding secrets in configuration files risks exposing them in version control. Attackers with access to the source code can easily compromise authentication.
**Prevention:** Always load secrets from environment variables (e.g., `os.environ.get("JWT_SECRET_KEY")`). Ensure the application fails fast if critical secrets are missing on startup.
