## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).
## 2024-05-18 - Hardcoded JWT Secret in Configuration

**Vulnerability:** A hardcoded `secret_key` was found in `config.yaml`. The key was used for signing JWT access tokens in the `backend/auth.py` implementation.

**Learning:** Hardcoding secrets such as JWT signing keys directly into configuration files or source code allows anyone with access to the codebase (e.g. via source control) to impersonate users, forge tokens, and escalate privileges.

**Prevention:** Always load sensitive credentials and keys from secure environment variables at runtime, and ensure that configuration logic fails fast if these critical secrets are missing, so that the application cannot accidentally start in an insecure state.
