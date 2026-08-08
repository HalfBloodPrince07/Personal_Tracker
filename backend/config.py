"""Configuration loader for PLIS."""
import yaml
import os
from pathlib import Path

CONFIG_PATH = Path(__file__).parent.parent / "config.yaml"

def load_config():
    """Load configuration from config.yaml."""
    with open(CONFIG_PATH, "r") as f:
        conf = yaml.safe_load(f)

    # Sentinel Security Enhancement: Support environment variables
    # to securely override default settings (e.g., JWT_SECRET_KEY)
    if "JWT_SECRET_KEY" in os.environ:
        if "auth" not in conf:
            conf["auth"] = {}
        conf["auth"]["secret_key"] = os.environ["JWT_SECRET_KEY"]

    return conf

config = load_config()
