"""Configuration loader for PLIS."""
import yaml
import os
from pathlib import Path

CONFIG_PATH = Path(__file__).parent.parent / "config.yaml"

def load_config():
    """Load configuration from config.yaml."""
    with open(CONFIG_PATH, "r") as f:
        conf = yaml.safe_load(f)

    # Strictly require JWT_SECRET_KEY for security
    jwt_secret = os.environ.get("JWT_SECRET_KEY")
    if not jwt_secret:
        raise ValueError("CRITICAL: JWT_SECRET_KEY environment variable is not set. Refusing to start.")

    if "auth" not in conf:
        conf["auth"] = {}
    conf["auth"]["secret_key"] = jwt_secret

    return conf

config = load_config()
