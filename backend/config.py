"""Configuration loader for PLIS."""
import yaml
from pathlib import Path

CONFIG_PATH = Path(__file__).parent.parent / "config.yaml"

import os

def load_config():
    """Load configuration from config.yaml."""
    with open(CONFIG_PATH, "r") as f:
        conf = yaml.safe_load(f)

    jwt_secret = os.getenv("JWT_SECRET_KEY")
    if not jwt_secret:
        raise ValueError("JWT_SECRET_KEY environment variable is not set")

    if "auth" not in conf:
        conf["auth"] = {}
    conf["auth"]["secret_key"] = jwt_secret

    return conf

config = load_config()
