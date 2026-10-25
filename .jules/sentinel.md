## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2024-05-25 - Hardcoded JWT Secret Key in Configuration
**Vulnerability:** A hardcoded `secret_key` ("plis-super-secret-key-change-in-production-2024") was found in `config.yaml` and loaded into the `backend/config.py`.
**Learning:** Having static or hardcoded secret keys checked into version control exposes applications to unauthorized access, such as forged JWTs.
**Prevention:** Remove hardcoded keys in favor of retrieving secrets from environment variables (e.g., `JWT_SECRET_KEY`). Ensure the application fails to start if crucial secrets are absent.
