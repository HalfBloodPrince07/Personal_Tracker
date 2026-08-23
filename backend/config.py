"""Configuration loader for PLIS."""
import yaml
from pathlib import Path

CONFIG_PATH = Path(__file__).parent.parent / "config.yaml"

import os

def load_config():
    """Load configuration from config.yaml."""
    with open(CONFIG_PATH, "r") as f:
        config = yaml.safe_load(f)

    # Securely override settings with environment variables
    jwt_secret = os.environ.get("JWT_SECRET_KEY")
    if jwt_secret and "auth" in config:
        config["auth"]["secret_key"] = jwt_secret

    return config

config = load_config()
