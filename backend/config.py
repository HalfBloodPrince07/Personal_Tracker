"""Configuration loader for PLIS."""
import os
import yaml
from pathlib import Path

CONFIG_PATH = Path(__file__).parent.parent / "config.yaml"

def load_config():
    """Load configuration from config.yaml."""
    with open(CONFIG_PATH, "r") as f:
        return yaml.safe_load(f)

config = load_config()

# Enforce JWT_SECRET_KEY is set in the environment
jwt_secret = os.environ.get("JWT_SECRET_KEY")
if not jwt_secret:
    raise ValueError("Critical Security Error: JWT_SECRET_KEY environment variable is not set.")

config["auth"]["secret_key"] = jwt_secret
