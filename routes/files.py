# routes/files.py
from flask import Blueprint, request, send_file, send_from_directory, redirect, jsonify
import os, io, zipfile, shutil

from config import UPLOAD_DIR
from services.filesystem import (
    safe_join, format_size, format_time, folder_stats
)
from routes.auth import logged_in

files_bp = Blueprint("files", __name__)

# ================= UPLOAD =================
@files_bp.route("/upload", methods=["POST"])
def upload():
    if not logged_in():
        return "Unauthorized", 401

    try:
        base = request.form.get("target", "")

        files = request.files.getlist("files")
        if not files:
            return "No files uploaded", 400

        for f in files:
            if f.filename == "":
                continue
            dest = safe_join(UPLOAD_DIR, base, f.filename)
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            f.save(dest)

        return "OK"
    except ValueError as e:
        return str(e), 400
    except Exception as e:
        return f"Upload failed: {str(e)}", 500


# ================= VIEW FILE (FIXES 404) =================
@files_bp.route("/files/<path:p>")
def serve_file(p):
    if not logged_in():
        return "Unauthorized", 401

    try:
        return send_from_directory(UPLOAD_DIR, p)
    except FileNotFoundError:
        return "File not found", 404


# ================= DOWNLOAD =================
@files_bp.route("/download/<path:p>")
def download(p):
    if not logged_in():
        return "Unauthorized", 401

    full = safe_join(UPLOAD_DIR, p)

    if os.path.isdir(full):
        mem = io.BytesIO()
        with zipfile.ZipFile(mem, "w", zipfile.ZIP_DEFLATED) as z:
            for root, _, files in os.walk(full):
                for f in files:
                    fp = os.path.join(root, f)
                    z.write(fp, arcname=os.path.relpath(fp, full))

        mem.seek(0)
        return send_file(
            mem,
            download_name=os.path.basename(p) + ".zip",
            as_attachment=True
        )

    return send_from_directory(
        UPLOAD_DIR,
        p,
        as_attachment=True
    )


# ================= DELETE =================
@files_bp.route("/delete/<path:p>")
def delete(p):
    if not logged_in():
        return "Unauthorized", 401

    if p.startswith(".system"):
        return "Forbidden", 403

    try:
        fp = safe_join(UPLOAD_DIR, p)
        if not os.path.exists(fp):
            return "File or folder not found", 404
        
        if os.path.isdir(fp):
            shutil.rmtree(fp)
        else:
            os.remove(fp)

        return redirect("/")
    except ValueError as e:
        return str(e), 400
    except Exception as e:
        return f"Delete failed: {str(e)}", 500


# ================= DETAILS =================
@files_bp.route("/details/<path:p>")
def details(p):
    if not logged_in():
        return "Unauthorized", 401

    try:
        full = safe_join(UPLOAD_DIR, p)
        st = os.stat(full)

        if os.path.isdir(full):
            s, f, fd = folder_stats(full)
            return jsonify(
                name=os.path.basename(p),
                type="Folder",
                size=format_size(s),
                files=f,
                folders=fd,
                ctime=format_time(st.st_ctime),
                mtime=format_time(st.st_mtime),
            )

        return jsonify(
            name=os.path.basename(p),
            type="File",
            size=format_size(st.st_size),
            ctime=format_time(st.st_ctime),
            mtime=format_time(st.st_mtime),
        )
    except (FileNotFoundError, ValueError) as e:
        return jsonify(error=str(e)), 404


# ================= RENAME =================
@files_bp.route("/rename", methods=["POST"])
def rename():
    if not logged_in():
        return "Unauthorized", 401

    try:
        old = request.form["old"]
        new = request.form["new"].strip()
        
        if not new:
            return "Name cannot be empty", 400
        
        if "/" in new or "\\" in new:
            return "Name cannot contain path separators", 400
        
        oldp = safe_join(UPLOAD_DIR, old)
        newp = safe_join(os.path.dirname(oldp), new)
        
        if os.path.exists(newp):
            return "File or folder already exists", 409
        
        os.rename(oldp, newp)
        return "OK"
    except (FileNotFoundError, ValueError) as e:
        return str(e), 400


# ================= MOVE =================
@files_bp.route("/move", methods=["POST"])
def move():
    if not logged_in():
        return "Unauthorized", 401

    try:
        source = request.form["source"]
        dest_folder = request.form.get("dest", "")
        
        if source.startswith(".system"):
            return "Forbidden", 403
        
        sourcep = safe_join(UPLOAD_DIR, source)
        filename = os.path.basename(sourcep)
        destp = safe_join(UPLOAD_DIR, dest_folder, filename)
        
        if os.path.exists(destp):
            return "File or folder already exists in destination", 409
        
        os.makedirs(os.path.dirname(destp), exist_ok=True)
        shutil.move(sourcep, destp)
        return "OK"
    except (FileNotFoundError, ValueError) as e:
        return str(e), 400


# ================= COPY =================
@files_bp.route("/copy", methods=["POST"])
def copy():
    if not logged_in():
        return "Unauthorized", 401

    try:
        source = request.form["source"]
        dest_folder = request.form.get("dest", "")
        
        if source.startswith(".system"):
            return "Forbidden", 403
        
        sourcep = safe_join(UPLOAD_DIR, source)
        filename = os.path.basename(sourcep)
        destp = safe_join(UPLOAD_DIR, dest_folder, filename)
        
        # Handle collision by appending (copy N)
        if os.path.exists(destp):
            base, ext = os.path.splitext(filename)
            counter = 1
            while os.path.exists(destp):
                new_name = f"{base} (copy {counter}){ext}"
                destp = safe_join(UPLOAD_DIR, dest_folder, new_name)
                counter += 1
        
        os.makedirs(os.path.dirname(destp), exist_ok=True)
        
        if os.path.isdir(sourcep):
            shutil.copytree(sourcep, destp)
        else:
            shutil.copy2(sourcep, destp)
        
        return "OK"
    except (FileNotFoundError, ValueError) as e:
        return str(e), 400


# ================= BULK COPY =================
@files_bp.route("/bulk-copy", methods=["POST"])
def bulk_copy():
    if not logged_in():
        return "Unauthorized", 401

    try:
        paths = request.json.get("paths", [])
        dest_folder = request.json.get("dest", "")
        
        if not paths:
            return "No files specified", 400
        
        for p in paths:
            if p.startswith(".system"):
                continue
            
            sourcep = safe_join(UPLOAD_DIR, p)
            if not os.path.exists(sourcep):
                continue
                
            filename = os.path.basename(sourcep)
            destp = safe_join(UPLOAD_DIR, dest_folder, filename)
            
            # Handle collision
            if os.path.exists(destp):
                base, ext = os.path.splitext(filename)
                counter = 1
                while os.path.exists(destp):
                    new_name = f"{base} (copy {counter}){ext}"
                    destp = safe_join(UPLOAD_DIR, dest_folder, new_name)
                    counter += 1
            
            os.makedirs(os.path.dirname(destp), exist_ok=True)
            
            if os.path.isdir(sourcep):
                shutil.copytree(sourcep, destp)
            else:
                shutil.copy2(sourcep, destp)
        
        return "OK"
    except (ValueError, Exception) as e:
        return str(e), 400


# ================= BULK DELETE =================
@files_bp.route("/bulk-delete", methods=["POST"])
def bulk_delete():
    if not logged_in():
        return "Unauthorized", 401

    try:
        paths = request.json.get("paths", [])
        if not paths:
            return "No files specified", 400
        
        for p in paths:
            if p.startswith(".system"):
                continue
            
            fp = safe_join(UPLOAD_DIR, p)
            if os.path.exists(fp):
                if os.path.isdir(fp):
                    shutil.rmtree(fp)
                else:
                    os.remove(fp)
        
        return "OK"
    except (ValueError, Exception) as e:
        return str(e), 400


# ================= CREATE FOLDER =================
@files_bp.route("/create-folder", methods=["POST"])
def create_folder():
    if not logged_in():
        return "Unauthorized", 401

    try:
        path = request.json.get("path", "").strip()
        
        if not path:
            return "Path cannot be empty", 400
        
        if path.startswith(".system"):
            return "Forbidden", 403
        
        folder_path = safe_join(UPLOAD_DIR, path)
        
        if os.path.exists(folder_path):
            return "Folder already exists", 409
        
        os.makedirs(folder_path, exist_ok=True)
        return "OK"
    except ValueError as e:
        return str(e), 400


# ================= STORAGE STATS =================
@files_bp.route("/storage-stats")
def storage_stats():
    if not logged_in():
        return "Unauthorized", 401

    try:
        total_size = 0
        file_count = 0
        folder_count = 0
        file_types = {}
        
        for root, dirs, files in os.walk(UPLOAD_DIR):
            if ".system" in root:
                continue
            folder_count += len([d for d in dirs if d != ".system"])
            
            for f in files:
                fp = os.path.join(root, f)
                size = os.path.getsize(fp)
                total_size += size
                file_count += 1
                
                ext = os.path.splitext(f)[1].lower()
                if ext:
                    file_types[ext] = file_types.get(ext, 0) + 1
        
        return jsonify(
            total_size=format_size(total_size),
            total_size_bytes=total_size,
            file_count=file_count,
            folder_count=folder_count,
            file_types=dict(sorted(file_types.items(), key=lambda x: x[1], reverse=True)[:10])
        )
    except Exception as e:
        return jsonify(error=str(e)), 500


# ================= TEXT FILE OPERATIONS =================
@files_bp.route("/read-text/<path:p>")
def read_text(p):
    if not logged_in():
        return "Unauthorized", 401

    try:
        full = safe_join(UPLOAD_DIR, p)
        with open(full, "r", encoding="utf-8") as f:
            content = f.read()
        return jsonify(content=content, name=os.path.basename(p))
    except UnicodeDecodeError:
        return jsonify(error="File is not a text file"), 400
    except Exception as e:
        return jsonify(error=str(e)), 400


@files_bp.route("/save-text", methods=["POST"])
def save_text():
    if not logged_in():
        return "Unauthorized", 401

    try:
        path = request.json["path"]
        content = request.json["content"]
        
        full = safe_join(UPLOAD_DIR, path)
        with open(full, "w", encoding="utf-8") as f:
            f.write(content)
        return "OK"
    except Exception as e:
        return str(e), 400


@files_bp.route("/create-file", methods=["POST"])
def create_file():
    if not logged_in():
        return "Unauthorized", 401

    try:
        folder = request.json.get("folder", "")
        filename = request.json["filename"].strip()
        
        if not filename:
            return "Filename cannot be empty", 400
        
        if "/" in filename or "\\" in filename:
            return "Filename cannot contain path separators", 400
        
        full = safe_join(UPLOAD_DIR, folder, filename)
        if os.path.exists(full):
            return "File already exists", 409
        
        os.makedirs(os.path.dirname(full), exist_ok=True)
        with open(full, "w", encoding="utf-8") as f:
            f.write("")
        return "OK"
    except Exception as e:
        return str(e), 400
