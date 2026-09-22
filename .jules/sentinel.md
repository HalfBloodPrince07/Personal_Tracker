## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2024-05-24 - Hardcoded JWT Secret Key in Configuration
**Vulnerability:** A hardcoded `secret_key` ("plis-super-secret-key-change-in-production-2024") was found inside `config.yaml` and loaded directly into `backend/config.py` for JWT signing and verification.
**Learning:** Checking in default fallback secrets in configuration files can easily lead to their usage in production environments if developers forget to override them, leading to complete session and authentication bypass.
**Prevention:** Never include hardcoded secrets in source control. Enforce the presence of secrets via environment variables in the application startup phase (e.g., throwing a `ValueError` if `JWT_SECRET_KEY` is not found).
