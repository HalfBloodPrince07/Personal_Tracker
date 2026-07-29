"""Configuration loader for PLIS."""
import yaml
import os
from pathlib import Path

CONFIG_PATH = Path(__file__).parent.parent / "config.yaml"

def load_config():
    """Load configuration from config.yaml."""
    with open(CONFIG_PATH, "r") as f:
        config = yaml.safe_load(f)

    # Override JWT secret key from environment variables for security
    env_secret = os.environ.get("JWT_SECRET_KEY")
    if env_secret and "auth" in config:
        config["auth"]["secret_key"] = env_secret

    return config

config = load_config()
