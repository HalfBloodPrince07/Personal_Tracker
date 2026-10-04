## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2024-10-04 - Hardcoded JWT Secret Key in Configuration
**Vulnerability:** A hardcoded `secret_key` ("plis-super-secret-key-change-in-production-2024") was present in the `config.yaml` file, exposing the application to token forgery and authentication bypass if the codebase were ever compromised or made public.
**Learning:** Default fallback values or "change me" placeholders in configuration files often make it into production deployments unchanged. Secrets must never be stored in source control.
**Prevention:** Strictly require security-critical secrets via environment variables (e.g., `JWT_SECRET_KEY`) and fail-fast at application startup if they are missing. Avoid providing default secrets in codebase files altogether.
