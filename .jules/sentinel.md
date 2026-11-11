## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2024-05-24 - Hardcoded Secret Key in Configuration File
**Vulnerability:** A hardcoded `secret_key` ("plis-super-secret-key-change-in-production-2024") was found in `config.yaml`, potentially exposing the application to unauthorized JWT token generation and forging if the source code or configuration files are leaked or accessed by an unauthorized entity.
**Learning:** Hardcoding secrets like API keys or JWT signing keys in configuration files (even if marked "change in production") often leads to those secrets being committed to source control and ultimately being used in deployed environments by mistake, breaking the security model.
**Prevention:** Never hardcode secrets in source code or configuration files. Use environment variables (e.g., `os.environ.get("JWT_SECRET_KEY")`) to manage sensitive data. The application should be configured to fail fast (e.g., by raising a `ValueError`) if required secrets are absent from the environment.
