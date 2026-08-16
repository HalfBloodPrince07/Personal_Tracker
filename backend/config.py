"""Configuration loader for PLIS."""
import os
import yaml
from pathlib import Path

CONFIG_PATH = Path(__file__).parent.parent / "config.yaml"

def load_config():
    """Load configuration from config.yaml."""
    with open(CONFIG_PATH, "r") as f:
        cfg = yaml.safe_load(f) or {}

    # Override JWT secret key from environment variable if present
    if "JWT_SECRET_KEY" in os.environ:
        if "auth" not in cfg:
            cfg["auth"] = {}
        cfg["auth"]["secret_key"] = os.environ["JWT_SECRET_KEY"]

    return cfg

config = load_config()
