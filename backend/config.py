"""Configuration loader for PLIS."""
import yaml
from pathlib import Path

CONFIG_PATH = Path(__file__).parent.parent / "config.yaml"

import os

def load_config():
    """Load configuration from config.yaml."""
    with open(CONFIG_PATH, "r") as f:
        config_data = yaml.safe_load(f)

    # Override JWT secret key with environment variable if present
    env_secret_key = os.environ.get("JWT_SECRET_KEY")
    if env_secret_key:
        if "auth" not in config_data:
            config_data["auth"] = {}
        config_data["auth"]["secret_key"] = env_secret_key

    return config_data

config = load_config()
