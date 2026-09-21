## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2024-10-25 - [CRITICAL] Fix hardcoded JWT secret key
**Vulnerability:** A hardcoded `secret_key` for JWT authentication was found in `config.yaml`.
**Learning:** Hardcoded secrets in configuration files that are checked into source control are a critical security risk as they can easily be exposed to unauthorized parties, leading to full authentication bypass.
**Prevention:** Always load sensitive secrets like API keys and passwords from environment variables rather than hardcoding them in files checked into version control. Ensure fail-fast mechanisms are in place if they are not provided in the environment.
