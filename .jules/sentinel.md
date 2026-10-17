## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2024-05-24 - Hardcoded Secret Key in Configuration
**Vulnerability:** A hardcoded `secret_key` value was found in `config.yaml` (`plis-super-secret-key-change-in-production-2024`). Hardcoding sensitive keys into source code repositories can lead to severe data breaches if the code is accessed.
**Learning:** Config files like `config.yaml` are frequently committed into version control systems. Storing active or default security credentials in them is a critical vulnerability.
**Prevention:** Store secrets as environment variables (`JWT_SECRET_KEY`) and explicitly enforce their presence during application startup in the configuration logic (e.g., in `backend/config.py`).
