"""Configuration loader for PLIS."""
import os
import yaml
from pathlib import Path

CONFIG_PATH = Path(__file__).parent.parent / "config.yaml"

def load_config():
    """Load configuration from config.yaml."""
    with open(CONFIG_PATH, "r") as f:
        config = yaml.safe_load(f)

    jwt_secret_key = os.environ.get("JWT_SECRET_KEY")
    if not jwt_secret_key:
        raise ValueError("JWT_SECRET_KEY environment variable is not set.")

    if "auth" not in config:
        config["auth"] = {}

    config["auth"]["secret_key"] = jwt_secret_key
    return config

config = load_config()
