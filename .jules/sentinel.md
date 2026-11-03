## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2024-11-03 - Hardcoded JWT Secret Key in Configuration
**Vulnerability:** The JWT secret key was hardcoded in `config.yaml` as "plis-super-secret-key-change-in-production-2024". This file is tracked in version control, meaning the secret key was exposed to anyone with read access to the repository.
**Learning:** Hardcoding sensitive secrets like JWT signing keys directly into configuration files that are checked into version control is a critical security vulnerability. It compromises the authentication system, allowing attackers to forge arbitrary JWT tokens and impersonate any user.
**Prevention:** Store sensitive secrets in environment variables and require them to be set at runtime. The configuration loader (`backend/config.py`) should fail fast with an explicit error (e.g., `ValueError`) if the environment variable is not present, ensuring the application never runs with default or missing secrets.
