## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2024-10-26 - Hardcoded JWT Secret Key in Configuration
**Vulnerability:** The JWT secret key was hardcoded in `config.yaml` as plaintext. Committing static secrets to the repository is a critical risk, as anyone with access to the code can spoof authenticated users.
**Learning:** Configurations that are version-controlled should not contain sensitive credentials, API keys, or production secrets. Relying on default string replacements for deployment makes the codebase insecure by default.
**Prevention:** Always load secrets via environment variables in configuration files, and implement fail-fast checks (like raising `ValueError` in `config.py`) to prevent the application from starting if required secrets are absent. Use placeholders in template config files (e.g., `"MUST_BE_SET_IN_ENV"`).
