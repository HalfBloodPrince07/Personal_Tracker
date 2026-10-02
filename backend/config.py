"""Configuration loader for PLIS."""
import yaml
from pathlib import Path

CONFIG_PATH = Path(__file__).parent.parent / "config.yaml"

import os

def load_config():
    """Load configuration from config.yaml."""
    with open(CONFIG_PATH, "r") as f:
        cfg = yaml.safe_load(f)

    jwt_secret = os.environ.get("JWT_SECRET_KEY")
    if not jwt_secret:
        raise ValueError("CRITICAL: JWT_SECRET_KEY environment variable is not set. Refusing to start.")

    if "auth" not in cfg:
        cfg["auth"] = {}
    cfg["auth"]["secret_key"] = jwt_secret

    return cfg

config = load_config()
