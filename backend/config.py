"""Configuration loader for PLIS."""
import os
import yaml
from pathlib import Path

CONFIG_PATH = Path(__file__).parent.parent / "config.yaml"

def load_config():
    """Load configuration from config.yaml."""
    with open(CONFIG_PATH, "r") as f:
        cfg = yaml.safe_load(f)

    if "auth" in cfg and "JWT_SECRET_KEY" in os.environ:
        cfg["auth"]["secret_key"] = os.environ["JWT_SECRET_KEY"]

    return cfg

config = load_config()
