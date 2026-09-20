## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2024-05-24 - Hardcoded Secret Key in Configuration File
**Vulnerability:** The application used a hardcoded `secret_key` in `config.yaml` for JWT authentication. This secret key was committed to the repository and could be easily found.
**Learning:** Hardcoding secrets like JWT signing keys directly in code or config files compromises the security of the application and all user sessions, especially in open-source or publicly accessible codebases.
**Prevention:** Always read secrets and API keys from environment variables. Enforce this structurally by throwing an error (e.g., `ValueError`) during startup if required secrets are absent from the environment.
