"""Configuration loader for PLIS."""
import os
import yaml
from pathlib import Path

CONFIG_PATH = Path(__file__).parent.parent / "config.yaml"

def load_config():
    """Load configuration from config.yaml."""
    with open(CONFIG_PATH, "r") as f:
        config_data = yaml.safe_load(f)

    # Securely override JWT secret key using environment variable
    if "JWT_SECRET_KEY" in os.environ:
        config_data.setdefault("auth", {})["secret_key"] = os.environ["JWT_SECRET_KEY"]

    return config_data

config = load_config()
