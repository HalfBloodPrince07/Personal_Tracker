## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2024-05-24 - Hardcoded JWT Secret Key in Configuration File
**Vulnerability:** The application was using a hardcoded string ("plis-super-secret-key-change-in-production-2024") as the JWT Secret Key within the `config.yaml` file, which was tracked in version control.
**Learning:** Storing secrets in source code or configuration files tracked by version control exposes them to anyone with access to the repository, leading to potential authentication bypass or token forgery in production if the default key is not manually changed.
**Prevention:** Remove hardcoded secrets from configuration files and source code. Instead, enforce the use of environment variables (e.g., `JWT_SECRET_KEY`) for sensitive information. Implement a fail-fast mechanism during application startup that raises an error (like `ValueError`) if required secret environment variables are not provided.
