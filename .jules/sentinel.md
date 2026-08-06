## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2026-08-06 - Hardcoded JWT Secret Key in Configuration File
**Vulnerability:** The application stored its JWT `secret_key` securely in `config.yaml` as plaintext without a mechanism to override it via environment variables, posing a risk of secret leakage via version control and static source analysis tools.
**Learning:** Hardcoding sensitive configuration values restricts dynamic key rotation and violates basic security practices by leaving secrets embedded in source code/artifacts.
**Prevention:** Always read security-sensitive values (like secret keys, database passwords) from environment variables or a secure key management system at runtime, using configuration files strictly for non-sensitive default values.
