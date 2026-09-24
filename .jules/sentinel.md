## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2024-09-24 - Hardcoded JWT Secret Key in Configuration
**Vulnerability:** The application's core secret key, `secret_key`, was hardcoded directly into `config.yaml`. This exposes the secret to anyone with repository access, allowing them to forge JWT tokens and gain unauthorized access to any user account.
**Learning:** Configuration files tracked in version control should never contain production secrets. Even if a comment says "change in production", developers might forget to override it, or the repository history will forever contain the secret. Always fail fast if critical secrets are missing in the environment, instead of falling back to default/hardcoded values.
**Prevention:** Load secrets exclusively from environment variables (e.g., `os.environ.get('JWT_SECRET_KEY')`). If a necessary secret isn't provided, the application must refuse to start by raising an error (e.g., `ValueError`). Use a dummy/placeholder in example configuration files.
