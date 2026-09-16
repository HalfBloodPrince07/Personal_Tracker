## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2024-05-24 - Hardcoded JWT Secret Key in Configuration File
**Vulnerability:** The application's JWT secret key was hardcoded in `config.yaml` as plaintext (`auth.secret_key`).
**Learning:** Hardcoding secrets in configuration files that are checked into version control exposes highly sensitive credentials to anyone with access to the repository, leading to potential authentication bypass or token forgery.
**Prevention:** Never hardcode secrets in configuration files. Use environment variables (e.g., `os.environ.get`) to inject secrets at runtime, and enforce the presence of these environment variables during application startup by failing fast if they are missing.
