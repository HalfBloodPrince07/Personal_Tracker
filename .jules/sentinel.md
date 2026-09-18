## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2024-10-27 - Hardcoded JWT Secret Key in Configuration File
**Vulnerability:** The application was configured using a hardcoded `secret_key` in `config.yaml` for JWT authentication (`plis-super-secret-key-change-in-production-2024`).
**Learning:** Storing secrets in source control (even if intended to be changed in production) increases the risk of accidental exposure and creates a bad baseline default.
**Prevention:** Remove hardcoded secrets from all configuration files. Require secrets to be injected via environment variables (e.g., `JWT_SECRET_KEY`) and implement a fail-fast mechanism in configuration loading logic if required secrets are missing.
