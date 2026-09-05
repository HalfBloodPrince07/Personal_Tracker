## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2024-05-24 - Hardcoded Secret Key in config.yaml
**Vulnerability:** The `config.yaml` file contained a hardcoded `secret_key` for JWT authentication. This secret key was committed to the repository, making it publicly accessible and allowing anyone to forge authentication tokens.
**Learning:** Storing secrets like JWT signing keys directly in configuration files within source control is a critical security vulnerability. Configuration files should only contain structure, placeholders, or safe defaults for non-sensitive values.
**Prevention:** Always use environment variables for sensitive configuration values like secret keys, API keys, and database credentials. The configuration loading mechanism (e.g., `backend/config.py`) should securely read these variables and fail gracefully (or deliberately prevent startup) if required secrets are missing.
