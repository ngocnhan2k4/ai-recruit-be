from dataclasses import dataclass
from dotenv import load_dotenv
from pathlib import Path
import os

@dataclass
class Config:
    db_url: str
    itviec_cookie: str

def load_config():
    env_path = Path("../.env")

    load_dotenv(dotenv_path=env_path)

    return Config(
        db_url=os.environ.get("DATABASE_URL"),
        itviec_cookie=os.environ.get("ITVIEC_COOKIE"),
    )

CONFIG = load_config()