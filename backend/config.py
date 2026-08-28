"""Configuration loader for PLIS."""
import os
import yaml
from pathlib import Path

CONFIG_PATH = Path(__file__).parent.parent / "config.yaml"

def load_config():
    """Load configuration from config.yaml."""
    with open(CONFIG_PATH, "r") as f:
        cfg = yaml.safe_load(f)

    # Override auth secret key with environment variable if present
    env_secret = os.getenv("JWT_SECRET_KEY")
    if env_secret and "auth" in cfg:
        cfg["auth"]["secret_key"] = env_secret

    return cfg

config = load_config()
