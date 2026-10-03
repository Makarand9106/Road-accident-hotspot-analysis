"""
Global configuration loader for the Road Accident Hotspot Analysis & Risk Prediction project.
Works seamlessly across Windows, macOS, and Linux using pathlib.
Loads environment variables from .env file at repo root.
"""

import os
from pathlib import Path

# Base Paths
PYTHON_DIR = Path(__file__).resolve().parent
BASE_DIR = PYTHON_DIR.parent

# Load .env file from repository root if present
ENV_PATH = BASE_DIR / ".env"
try:
    from dotenv import load_dotenv
    if ENV_PATH.exists():
        load_dotenv(dotenv_path=ENV_PATH)
    else:
        load_dotenv()
except ImportError:
    # Graceful fallback before dependencies in requirements.txt are installed
    if ENV_PATH.exists():
        with open(ENV_PATH, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    os.environ.setdefault(key.strip(), val.strip())


# Data Directories
DATA_DIR = BASE_DIR / "data"
RAW_DATA_DIR = DATA_DIR / "raw"
PROCESSED_DATA_DIR = DATA_DIR / "processed"
REFERENCE_DATA_DIR = DATA_DIR / "reference"

# Other Core Directories
MODELS_DIR = BASE_DIR / "models"
DOCS_DIR = BASE_DIR / "docs"
FIGURES_DIR = DOCS_DIR / "figures"
RESULTS_DIR = DOCS_DIR / "results"
DATABASE_DIR = BASE_DIR / "database"

# Database Configuration
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "5432"))
DB_NAME = os.getenv("DB_NAME", "road_safety")
DB_USER = os.getenv("DB_USER") or os.getenv("USER") or "postgres"
DB_PASSWORD = os.getenv("DB_PASSWORD", "")

# SQLAlchemy / Connection URL
_default_url = (
    f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    if DB_PASSWORD
    else f"postgresql+psycopg2://{DB_USER}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = _default_url
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

# Backend & Server Settings
BACKEND_PORT = int(os.getenv("BACKEND_PORT", "4000"))

# Dataset Configuration
_raw_years = os.getenv("DATA_YEARS", "2021,2022,2023,2024,2025")
DATA_YEARS = [int(y.strip()) for y in _raw_years.split(",") if y.strip().isdigit()]

# Ensure runtime directories exist when referenced
for directory in [RAW_DATA_DIR, PROCESSED_DATA_DIR, REFERENCE_DATA_DIR, MODELS_DIR, FIGURES_DIR, RESULTS_DIR]:
    directory.mkdir(parents=True, exist_ok=True)


def get_db_url() -> str:
    """Return the configured PostgreSQL connection string."""
    return DATABASE_URL


def get_db_engine():
    """Create and return a SQLAlchemy engine using configured parameters."""
    from sqlalchemy import create_engine
    return create_engine(get_db_url())
