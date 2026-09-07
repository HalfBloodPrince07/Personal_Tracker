## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).
## 2024-10-27 - [CRITICAL] Fix hardcoded JWT secret key
**Vulnerability:** A hardcoded JWT secret key (`plis-super-secret-key-change-in-production-2024`) was found in `config.yaml` and loaded directly in `backend/config.py`.
**Learning:** Hardcoding secrets in configuration files checked into source control exposes the application to severe authentication bypass and impersonation risks if the source code is compromised.
**Prevention:** Always load sensitive secrets, such as JWT keys, database passwords, and API keys, from environment variables (e.g., using `os.environ.get()`) or a secure secret management service. Fail fast during application startup if required secrets are missing.
