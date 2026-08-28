## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2024-08-28 - Hardcoded JWT Secret Key in Configuration
**Vulnerability:** The application was relying on a hardcoded JWT secret key located in `config.yaml` and loaded directly into `backend/auth.py` via `backend/config.py` without the ability to securely override it via environment variables in production.
**Learning:** Hardcoded credentials in source code or configuration files that are checked into version control can easily be exposed if the repository becomes public or is compromised. It also makes credential rotation difficult.
**Prevention:** Configuration files should serve as defaults for non-sensitive data or placeholders for local development. Sensitive data, especially secrets, must be securely overridden using environment variables or a secrets manager in production environments.
