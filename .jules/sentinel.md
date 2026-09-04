## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2024-05-24 - Hardcoded JWT Secret Key in Configuration
**Vulnerability:** A hardcoded `secret_key` ("plis-super-secret-key-change-in-production-2024") was found in `config.yaml` and loaded into `backend/config.py`.
**Learning:** Configurations often use fallback or default values for development, which can easily be pushed to production and exploited by attackers. Relying on default configurations for sensitive values is a significant security risk.
**Prevention:** Remove hardcoded secrets from code and configuration files. Enforce the injection of secrets via environment variables, and implement a fail-fast mechanism (e.g., throwing a `ValueError` on application start) if the required environment variable is not present.
