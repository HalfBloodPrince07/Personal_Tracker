## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2024-05-25 - Hardcoded JWT Secret Key in Configuration
**Vulnerability:** The JWT secret key used for authentication was hardcoded in `config.yaml` as plaintext.
**Learning:** Checking in hardcoded secrets into version control (even in configuration files) poses a critical security risk as it exposes cryptographic keys to anyone with access to the repository, leading to potential authentication bypass or token forgery.
**Prevention:** Always load sensitive credentials like secret keys from environment variables or secure secret managers. Ensure that configuration loaders fail fast (e.g., raise an error) if required security credentials are not provided.
