"""Configuration loader for PLIS."""
import yaml
from pathlib import Path

CONFIG_PATH = Path(__file__).parent.parent / "config.yaml"

import os

def load_config():
    """Load configuration from config.yaml."""
    with open(CONFIG_PATH, "r") as f:
        config_data = yaml.safe_load(f)

    # Override with environment variables securely
    if "JWT_SECRET_KEY" in os.environ:
        if "auth" not in config_data:
            config_data["auth"] = {}
        config_data["auth"]["secret_key"] = os.environ["JWT_SECRET_KEY"]

    return config_data

config = load_config()
