"""Configuration loader for PLIS."""
import yaml
from pathlib import Path

CONFIG_PATH = Path(__file__).parent.parent / "config.yaml"

import os

def load_config():
    """Load configuration from config.yaml."""
    with open(CONFIG_PATH, "r") as f:
        conf = yaml.safe_load(f)

    # Securely override default settings with environment variables
    if os.environ.get("JWT_SECRET_KEY"):
        conf.setdefault("auth", {})["secret_key"] = os.environ["JWT_SECRET_KEY"]

    return conf

config = load_config()
