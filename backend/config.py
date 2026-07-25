"""Configuration loader for PLIS."""
import yaml
from pathlib import Path

CONFIG_PATH = Path(__file__).parent.parent / "config.yaml"

import os

def load_config():
    """Load configuration from config.yaml."""
    with open(CONFIG_PATH, "r") as f:
        config_data = yaml.safe_load(f)

    # Securely override JWT secret key using environment variables
    env_secret = os.environ.get("JWT_SECRET_KEY")
    if env_secret and "auth" in config_data:
        config_data["auth"]["secret_key"] = env_secret

    return config_data

config = load_config()
