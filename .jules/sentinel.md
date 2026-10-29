## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2024-10-29 - Hardcoded JWT Secret Key in Configuration
**Vulnerability:** A hardcoded `secret_key` value was present in `config.yaml` for JWT authentication. This secret could easily be leaked if the codebase is shared, exposed, or committed to a public repository, allowing attackers to forge arbitrary authentication tokens.
**Learning:** Hardcoding sensitive secrets like JWT signing keys directly into configuration files that are checked into version control is a critical security vulnerability.
**Prevention:** Always use environment variables (e.g., `os.environ.get("JWT_SECRET_KEY")`) to inject sensitive values into the application at runtime. Enforce a strict validation at application startup that raises an exception (e.g., `ValueError`) if these environment variables are missing.
