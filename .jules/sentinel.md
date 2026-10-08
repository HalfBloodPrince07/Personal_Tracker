## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2026-10-08 - Hardcoded JWT Secret Key in Configuration File
**Vulnerability:** The application stored the JWT secret key as plain text directly in the `config.yaml` file, which is often tracked by version control systems, exposing it to potential attackers with read access to the repository.
**Learning:** Hardcoding sensitive configuration such as authentication secrets or API keys in source-tracked configuration files drastically increases the risk of credential compromise and unauthorized access. Secrets should always be provisioned independently of the application source code.
**Prevention:** Remove all sensitive secrets from configuration files and enforce loading them via environment variables at runtime. Fail fast (e.g., raise a `ValueError`) if required security-related environment variables are missing to prevent insecure defaults or fallback configurations.
