"""Configuration loader for PLIS."""
import os
import yaml
from pathlib import Path

CONFIG_PATH = Path(__file__).parent.parent / "config.yaml"

def load_config():
    """Load configuration from config.yaml."""
    with open(CONFIG_PATH, "r") as f:
        config = yaml.safe_load(f)

    # Override sensitive settings via environment variables
    if "JWT_SECRET_KEY" in os.environ:
        if "auth" not in config:
            config["auth"] = {}
        config["auth"]["secret_key"] = os.environ["JWT_SECRET_KEY"]

    return config

config = load_config()
