"""Configuration loader for PLIS."""
import os
import yaml
from pathlib import Path

CONFIG_PATH = Path(__file__).parent.parent / "config.yaml"

def load_config():
    """Load configuration from config.yaml."""
    with open(CONFIG_PATH, "r") as f:
        config_data = yaml.safe_load(f)

        # Security: Enforce JWT_SECRET_KEY via environment variables
        jwt_secret = os.getenv("JWT_SECRET_KEY")
        if not jwt_secret:
            raise ValueError("CRITICAL SECURITY ERROR: JWT_SECRET_KEY environment variable is not set. Refusing to start.")

        # Override any hardcoded secret with the secure environment variable
        if "auth" not in config_data:
            config_data["auth"] = {}
        config_data["auth"]["secret_key"] = jwt_secret

        return config_data

config = load_config()
