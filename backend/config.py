"""Configuration loader for PLIS."""
import os
import yaml
from pathlib import Path

CONFIG_PATH = Path(__file__).parent.parent / "config.yaml"

def load_config():
    """Load configuration from config.yaml."""
    with open(CONFIG_PATH, "r") as f:
        config_data = yaml.safe_load(f)

    # Override JWT secret if provided via environment variable
    if "auth" in config_data and os.environ.get("JWT_SECRET_KEY"):
        config_data["auth"]["secret_key"] = os.environ.get("JWT_SECRET_KEY")

    return config_data

config = load_config()
