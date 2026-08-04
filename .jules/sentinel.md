## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2024-08-04 - Hardcoded JWT Secret Key in Configuration
**Vulnerability:** The application was using a hardcoded JWT secret key from `config.yaml` (`plis-super-secret-key-change-in-production-2024`) for generating access tokens.
**Learning:** Hardcoded secrets in configuration files that get committed to version control can be easily exposed, leading to complete compromise of the authentication system. The `backend/config.py` did not provide a way to override this secret using environment variables in production.
**Prevention:** Always read sensitive secrets (like JWT keys, API keys, database passwords) from environment variables, falling back to a default configuration only for local development (and even then, preferably using `.env` files). `backend/config.py` was updated to check for `JWT_SECRET_KEY` in `os.environ`.
