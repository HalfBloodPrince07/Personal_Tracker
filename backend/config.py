"""Configuration loader for PLIS."""
import os
import yaml
from pathlib import Path

CONFIG_PATH = Path(__file__).parent.parent / "config.yaml"

def load_config():
    """Load configuration from config.yaml."""
    with open(CONFIG_PATH, "r") as f:
        config_data = yaml.safe_load(f)

    # Load secret key from environment variable
    secret_key = os.environ.get("JWT_SECRET_KEY")
    if not secret_key:
        raise ValueError("JWT_SECRET_KEY environment variable is missing. It must be set for security.")

    # Ensure auth dict exists
    if "auth" not in config_data:
        config_data["auth"] = {}

    config_data["auth"]["secret_key"] = secret_key

    return config_data

config = load_config()
