"""Configuration loader for PLIS."""
import yaml
import os
from pathlib import Path

CONFIG_PATH = Path(__file__).parent.parent / "config.yaml"

def load_config():
    """Load configuration from config.yaml."""
    with open(CONFIG_PATH, "r") as f:
        config_data = yaml.safe_load(f)

    # Retrieve JWT secret key from environment variable for security
    jwt_secret_key = os.environ.get("JWT_SECRET_KEY")
    if not jwt_secret_key:
        raise ValueError("JWT_SECRET_KEY environment variable must be set for security.")

    # Inject into auth config
    if "auth" not in config_data:
        config_data["auth"] = {}
    config_data["auth"]["secret_key"] = jwt_secret_key

    return config_data

config = load_config()
