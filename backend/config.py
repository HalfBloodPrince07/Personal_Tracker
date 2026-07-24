"""Configuration loader for PLIS."""
import yaml
import os
from pathlib import Path

CONFIG_PATH = Path(__file__).parent.parent / "config.yaml"

def load_config():
    """Load configuration from config.yaml."""
    with open(CONFIG_PATH, "r") as f:
        config_data = yaml.safe_load(f)

    # Override JWT_SECRET_KEY from environment variables if present
    env_secret = os.getenv("JWT_SECRET_KEY")
    if env_secret and "auth" in config_data:
        config_data["auth"]["secret_key"] = env_secret

    return config_data

config = load_config()
