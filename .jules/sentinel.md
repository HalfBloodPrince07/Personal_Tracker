## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).

## 2026-08-18 - Hardcoded JWT Secret Key in Configuration
**Vulnerability:** The JWT secret key was hardcoded in `config.yaml` and directly loaded into `backend/auth.py` without supporting environment variable overrides, risking credential exposure if the repository is compromised.
**Learning:** Hardcoding sensitive configuration values like secrets in files tracked by version control can lead to security breaches, especially since they cannot easily be overridden safely in deployment environments.
**Prevention:** Implement logic to read sensitive configuration keys from environment variables securely, allowing environment variables to override values in local configuration files.
