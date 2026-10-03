## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2026-10-03 - Hardcoded JWT Secret Key in Configuration
**Vulnerability:** A hardcoded `secret_key` ("plis-super-secret-key-change-in-production-2024") was found in `config.yaml`, allowing anyone with access to the source code to forge authentication tokens.
**Learning:** Default or example secrets left in configuration files are a critical risk, especially when the codebase might be shared or version-controlled. Applications should never rely on hardcoded secrets, even with warnings to "change in production".
**Prevention:** Remove all hardcoded secrets from configuration files and enforce their provision via environment variables (e.g., `JWT_SECRET_KEY`). Implement fail-fast logic during application startup (e.g., `ValueError`) if required security environment variables are missing.
