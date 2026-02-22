import uvicorn
import logging
import sys

# Configure logging to write to both file and console
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("backend.log"),
        logging.StreamHandler(sys.stdout)
    ]
)

# Also capture Uvicorn logs
logger = logging.getLogger("uvicorn")
logger.setLevel(logging.INFO)

if __name__ == "__main__":
    print("Starting backend server...")
    uvicorn.run(
        "backend.api:app",
        host="0.0.0.0",
        port=8000,
        log_config=None,  # Use existing logging config
        reload=False
    )
