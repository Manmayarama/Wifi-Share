# services/filesystem.py
import os, datetime

def safe_join(base, *paths):
    base = os.path.abspath(base)
    target = os.path.abspath(os.path.join(base, *paths))
    if not target.startswith(base):
        raise ValueError("Unsafe path")
    return target

def format_size(n):
    for u in ["B","KB","MB","GB","TB"]:
        if n < 1024:
            return f"{n:.1f} {u}"
        n /= 1024
    return f"{n:.1f} PB"

def format_time(ts):
    return datetime.datetime.fromtimestamp(ts).strftime("%Y-%m-%d %H:%M")

def folder_stats(path):
    size = files = folders = 0
    for root, dirs, fs in os.walk(path):
        folders += len(dirs)
        for f in fs:
            files += 1
            size += os.path.getsize(os.path.join(root, f))
    return size, files, folders

def list_dir(upload_dir, rel=""):
    base = safe_join(upload_dir, rel) if rel else upload_dir
    items = []
    for name in sorted(os.listdir(base)):
        if name == ".system":
            continue
        full = os.path.join(base, name)
        is_dir = os.path.isdir(full)
        # mtime for both files and folders; size only for files
        mtime = os.path.getmtime(full)
        size = os.path.getsize(full) if not is_dir else -1
        items.append({
            "name": name,
            "path": os.path.join(rel, name).replace("\\", "/"),
            "is_dir": is_dir,
            "mtime": mtime,
            "size": size
        })
    return items

def collect_folders(upload_dir, rel=""):
    base = safe_join(upload_dir, rel) if rel else upload_dir
    res = []
    for name in os.listdir(base):
        if name == ".system":
            continue
        full = os.path.join(base, name)
        if os.path.isdir(full):
            p = os.path.join(rel, name).replace("\\", "/")
            res.append(p)
            res.extend(collect_folders(upload_dir, p))
    return res
