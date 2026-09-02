"""Configuration loader for PLIS."""
import yaml
from pathlib import Path

CONFIG_PATH = Path(__file__).parent.parent / "config.yaml"

import os

def load_config():
    """Load configuration from config.yaml."""
    with open(CONFIG_PATH, "r") as f:
        config = yaml.safe_load(f)

    # Override JWT secret key with environment variable if present
    if "JWT_SECRET_KEY" in os.environ:
        config["auth"]["secret_key"] = os.environ["JWT_SECRET_KEY"]

    if not config.get("auth", {}).get("secret_key"):
        raise ValueError("JWT_SECRET_KEY environment variable is required and cannot be empty.")

    return config

config = load_config()
