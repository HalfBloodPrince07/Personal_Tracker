## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2024-08-17 - Hardcoded JWT Secret Key in Configuration
**Vulnerability:** The application was using a hardcoded JWT secret key stored in plaintext in the `config.yaml` file, which was committed to the repository and relied upon by `backend/config.py`.
**Learning:** Hardcoding sensitive secrets like JWT signing keys directly into the configuration files stored in source control exposes these credentials to anyone with access to the repository, breaking the defense-in-depth security layer.
**Prevention:** Always implement mechanisms to read sensitive secrets from environment variables (e.g., using `os.environ` in Python). Fallback to standard config files is acceptable for non-sensitive local development, but environment variables must be prioritized for overrides in production.
