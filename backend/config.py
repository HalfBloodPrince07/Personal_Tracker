"""Configuration loader for PLIS."""
import os
import yaml
from pathlib import Path

CONFIG_PATH = Path(__file__).parent.parent / "config.yaml"

def load_config():
    """Load configuration from config.yaml."""
    with open(CONFIG_PATH, "r") as f:
        cfg = yaml.safe_load(f)

    # Support using environment variables to securely override default settings
    jwt_secret = os.getenv("JWT_SECRET_KEY")
    if jwt_secret:
        if "auth" not in cfg:
            cfg["auth"] = {}
        cfg["auth"]["secret_key"] = jwt_secret

    return cfg

config = load_config()
