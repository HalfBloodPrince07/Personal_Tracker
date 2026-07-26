"""Configuration loader for PLIS."""
import os
import yaml
from pathlib import Path

CONFIG_PATH = Path(__file__).parent.parent / "config.yaml"

def load_config():
    """Load configuration from config.yaml."""
    with open(CONFIG_PATH, "r") as f:
        config_data = yaml.safe_load(f)

    # Securely override JWT secret key with environment variable if present
    if "auth" in config_data:
        env_secret = os.environ.get("JWT_SECRET_KEY")
        if env_secret:
            config_data["auth"]["secret_key"] = env_secret

    return config_data

config = load_config()
