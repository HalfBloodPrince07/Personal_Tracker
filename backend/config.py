"""Configuration loader for PLIS."""
import os
import yaml
from pathlib import Path

CONFIG_PATH = Path(__file__).parent.parent / "config.yaml"

def load_config():
    """Load configuration from config.yaml."""
    with open(CONFIG_PATH, "r") as f:
        config_data = yaml.safe_load(f)

    # Read JWT_SECRET_KEY from environment variables for security
    jwt_secret = os.environ.get("JWT_SECRET_KEY")
    if not jwt_secret:
        raise ValueError("CRITICAL: JWT_SECRET_KEY environment variable is not set. Refusing to start.")

    config_data["auth"]["secret_key"] = jwt_secret
    return config_data

config = load_config()
