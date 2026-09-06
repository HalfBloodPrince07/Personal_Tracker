## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2024-09-06 - Hardcoded JWT Secret Key in Configuration File
**Vulnerability:** The `JWT_SECRET_KEY` was hardcoded directly in `config.yaml` as plaintext. If committed to version control, it exposes the application's authentication security to anyone with access to the repo.
**Learning:** Hardcoded sensitive strings in configuration files are a significant risk. Authentication relies heavily on keeping the secret key strictly private.
**Prevention:** Remove hardcoded secrets from code and config files. Enforce the usage of environment variables (e.g. `os.environ.get("JWT_SECRET_KEY")`) to securely inject sensitive data into the application during runtime. Ensure that missing environment variables raise immediate runtime errors ("fail securely/fast") to prevent unintended fallback behavior.
