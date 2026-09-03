## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2024-05-18 - [CRITICAL] Fix hardcoded JWT secret
**Vulnerability:** A hardcoded `secret_key` for JWT was found in `config.yaml`.
**Learning:** Hardcoding secrets like JWT keys in configuration files stored in source control exposes the application to severe authentication bypass and spoofing attacks. Anyone with access to the repo would be able to mint their own valid JWT tokens, fully bypassing authentication.
**Prevention:** Always require sensitive credentials such as API keys and secret keys to be loaded from environment variables (e.g. `JWT_SECRET_KEY`) or a secure secret management system, rather than checked into version control. Ensure the application fails to start if strictly required security configurations are missing.
