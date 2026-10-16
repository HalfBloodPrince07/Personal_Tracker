## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2024-05-25 - Hardcoded JWT Secret Key in Configuration
**Vulnerability:** The JWT secret key (`plis-super-secret-key-change-in-production-2024`) was hardcoded directly in `config.yaml` and committed to the repository. This exposes the application to critical authentication bypass and token forgery if the repository is compromised or public.
**Learning:** Hardcoding sensitive secrets like JWT signing keys directly into configuration files or version control guarantees compromise in the event of unauthorized access to the codebase.
**Prevention:** Never commit secret keys or sensitive credentials into the codebase. Always extract secrets from environment variables (e.g., `os.environ.get("JWT_SECRET_KEY")`) and ensure the application fails fast (e.g., throwing a `ValueError`) if the environment variables are not provided.
