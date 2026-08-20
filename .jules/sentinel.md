## 2024-05-24 - JWT Token and Secret Key Leakage in Auth Logging
**Vulnerability:** Debug print statements in `backend/auth.py`'s `get_current_user` dependency leaked the raw JWT token, the decoded payload, and the first 5 characters of the secret key to standard output on authentication failures.
**Learning:** Development debugging patterns involving print statements or excessive logging can inadvertently capture and expose highly sensitive credentials in production logs.
**Prevention:** Remove debug `print` statements before committing auth code. Use standard `logging` with appropriate levels (e.g., `logger.warning`) and ensure that secrets, tokens, or raw payloads are never logged. Log only actionable, non-sensitive context (e.g., "Invalid token for user ID X" rather than the token itself).
## 2024-05-24 - Hardcoded Secret Keys Support in Configuration
**Vulnerability:** The codebase lacked a mechanism to inject sensitive configuration values (like `JWT_SECRET_KEY`) from environment variables, forcing operators to commit them to the configuration files (`config.yaml`).
**Learning:** Configurations involving sensitive security tokens must always support overrides via environment variables out of the box to prevent accidental commits of production secrets.
**Prevention:** In configuration loaders (like `backend/config.py`), implement environment variable overlays immediately after parsing configuration files. Ensure that the default template includes dummy values and warns developers if the key hasn't been changed via the environment.
