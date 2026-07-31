## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).
## 2024-05-24 - Missing Environment Variable Support for Secrets
**Vulnerability:** The application was solely relying on a `config.yaml` file to load the `auth.secret_key` which is used for JWT generation and validation. Hardcoding or storing this secret in a file that might be committed to source control is a significant security risk.
**Learning:** Configurations shouldn't restrict secrets to files, and the application must always provide an environment variable override for critical secrets (like JWT keys, API keys).
**Prevention:** Always implement a mechanism to override configuration file values using environment variables in the configuration loader.
