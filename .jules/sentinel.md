## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2024-11-04 - Hardcoded JWT Secret Key in Configuration
**Vulnerability:** The JWT secret key was hardcoded as `plis-super-secret-key-change-in-production-2024` in `config.yaml`, allowing anyone with access to the source code to forge valid authentication tokens.
**Learning:** Configurations often start with hardcoded default credentials during early development that are accidentally pushed to version control, posing a significant security risk if not rectified before deployment or if the codebase is made public.
**Prevention:** Do not hardcode sensitive secrets in configuration files or code. Store them in environment variables instead (e.g., `os.environ.get("JWT_SECRET_KEY")`). Additionally, implementing a "fail fast" mechanism where the application explicitly raises an error if the secret environment variable is missing prevents running in an insecure state by default.
