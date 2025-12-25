# config.py
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
SYSTEM_DIR = os.path.join(UPLOAD_DIR, ".system")
LINKS_JSON = os.path.join(SYSTEM_DIR, "links.json")

# Security settings
PASSWORD = "1234"
PORT = 8000

# File upload limits (in bytes)
# 5 GB max upload size
MAX_CONTENT_LENGTH = 5 * 1024 * 1024 * 1024  # 5 GB
