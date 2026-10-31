"""Configuration loader for PLIS."""
import os
import yaml
from pathlib import Path

CONFIG_PATH = Path(__file__).parent.parent / "config.yaml"

def load_config():
    """Load configuration from config.yaml."""
    with open(CONFIG_PATH, "r") as f:
        cfg = yaml.safe_load(f)

    secret_key = os.environ.get("JWT_SECRET_KEY")
    if not secret_key:
        raise ValueError("JWT_SECRET_KEY environment variable is required")

    if "auth" not in cfg:
        cfg["auth"] = {}
    cfg["auth"]["secret_key"] = secret_key

    return cfg

config = load_config()
