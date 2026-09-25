## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2024-05-24 - Hardcoded Secret Key in Configuration
**Vulnerability:** The application stored its highly sensitive JWT secret key directly in `config.yaml` as plaintext.
**Learning:** Secrets embedded in source control or configuration files are immediately compromised if the repository is accessed. Even if it's meant for local development initially, it poses a huge risk as the same secret might inadvertently leak to production or other users.
**Prevention:** Never hardcode secrets in configuration files. Always load sensitive values (like API keys, JWT secrets, database credentials) from the environment (e.g., using `os.getenv`). Fail-fast by throwing an error on startup if required secrets are absent, preventing the application from running in an insecure state.
