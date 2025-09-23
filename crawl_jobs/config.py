from dotenv import load_dotenv
from pathlib import Path
import os

def load_config():
    env_path = Path("../.env")

    load_dotenv(dotenv_path=env_path)

    db_url = os.getenv("DATABASE_URL")

    return db_url