## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).
## 2024-05-18 - Remove Hardcoded JWT Secret Key
**Vulnerability:** A hardcoded `secret_key` for JWT authentication was found in `config.yaml`.
**Learning:** Storing secrets in plain text configuration files poses a severe security risk, as anyone with access to the source code can compromise user authentication.
**Prevention:** Use environment variables to inject sensitive information like API keys, secrets, and passwords at runtime.
