# routes/views.py
from flask import Blueprint, render_template, redirect
from config import UPLOAD_DIR
from services.filesystem import list_dir, collect_folders
from routes.auth import logged_in

views = Blueprint("views", __name__)

@views.route("/")
def index():
    return render_template(
        "index.html",
        ok=logged_in(),
        items=list_dir(UPLOAD_DIR),
        folders=collect_folders(UPLOAD_DIR)
    )

@views.route("/browse/<path:p>")
def browse(p):
    if not logged_in():
        return redirect("/")
    return render_template(
        "index.html",
        ok=True,
        items=list_dir(UPLOAD_DIR, p),
        folders=collect_folders(UPLOAD_DIR)
    )
