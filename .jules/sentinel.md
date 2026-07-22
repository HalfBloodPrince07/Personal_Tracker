
## 2024-07-22 - [Critical] Logging Sensitive Data & Hardcoded JWT Secret Key
**Vulnerability:** JWT tokens and the application's SECRET_KEY were being logged during failed authentications in `backend/auth.py`. Additionally, the JWT secret key was hardcoded in `config.yaml` without a clear mechanism to override it via environment variables in production.
**Learning:** Hardcoding secrets and printing them during error handling can expose them to logs, leading to a critical security vulnerability.
**Prevention:** Avoid logging sensitive information in authentication code by providing generic error messages for JWT validation errors. Always provide a mechanism to inject sensitive configuration values through environment variables so production secrets are decoupled from code.
