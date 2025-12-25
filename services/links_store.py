# services/links_store.py
import json, os

def load_links(path):
    if not os.path.exists(path) or os.path.getsize(path) == 0:
        return []
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError:
        return []

def write_links(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
