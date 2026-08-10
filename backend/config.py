"""Configuration loader for PLIS."""
import os
import yaml
from pathlib import Path

CONFIG_PATH = Path(__file__).parent.parent / "config.yaml"

def load_config():
    """Load configuration from config.yaml."""
    with open(CONFIG_PATH, "r") as f:
        config_data = yaml.safe_load(f)

    # Override JWT Secret Key with environment variable if present
    jwt_secret = os.getenv("JWT_SECRET_KEY")
    if jwt_secret:
        if "auth" not in config_data:
            config_data["auth"] = {}
        config_data["auth"]["secret_key"] = jwt_secret
    else:
        # Prevent starting with the insecure default key if not overridden
        if config_data.get("auth", {}).get("secret_key") == "default-insecure-key-do-not-use-in-production":
            # For development, we allow the insecure key but print a warning.
            # In a strict production setting, we would raise an exception here.
            import logging
            logging.getLogger(__name__).warning(
                "WARNING: Using default insecure JWT secret key. "
                "Set JWT_SECRET_KEY environment variable in production!"
            )

    return config_data

config = load_config()
