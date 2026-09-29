## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2026-09-29 - Hardcoded JWT Secret Key
**Vulnerability:** A hardcoded JWT secret key was found in `config.yaml` (`plis-super-secret-key-change-in-production-2024`). This exposes the secret to version control, making it visible to anyone with read access to the repository, which can lead to complete authentication bypass if the repository is leaked or accessed by unauthorized individuals.
**Learning:** Hardcoding sensitive configuration like `secret_key` in a configuration file checked into version control is a critical security vulnerability.
**Prevention:** Always read secrets from environment variables and ensure the application fails fast if the variable is not set. Removed the secret from the config and enforced `os.environ.get("JWT_SECRET_KEY")` in `backend/config.py`.
