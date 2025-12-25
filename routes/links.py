# routes/links.py
from flask import Blueprint, request, jsonify
import secrets, datetime
from config import LINKS_JSON
from services.links_store import load_links, write_links
from routes.auth import logged_in

links = Blueprint("links", __name__)

@links.route("/links")
def get_links():
    return jsonify(load_links(LINKS_JSON))

@links.route("/links/add", methods=["POST"])
@links.route("/add-link", methods=["POST"])
def add_link():
    if not logged_in():
        return "Unauthorized", 401

    # Support both JSON and form data
    if request.is_json:
        name = request.json.get("name")
        url = request.json.get("url")
    else:
        name = request.form.get("n")
        url = request.form.get("u")
    
    if not name or not url:
        return "Name and URL required", 400

    data = load_links(LINKS_JSON)
    data.append({
        "id": secrets.token_hex(8),
        "name": name,
        "url": url,
        "created": datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    })
    write_links(LINKS_JSON, data)
    return "OK"

@links.route("/links/edit", methods=["POST"])
def edit_link():
    if not logged_in():
        return "Unauthorized", 401

    data = load_links(LINKS_JSON)
    for l in data:
        if l["id"] == request.json["id"]:
            l["name"] = request.json["name"]
            l["url"] = request.json["url"]
    write_links(LINKS_JSON, data)
    return "OK"

@links.route("/links/delete", methods=["POST"])
def delete_link_post():
    if not logged_in():
        return "Unauthorized", 401

    data = load_links(LINKS_JSON)
    link_id = request.json.get("id") if request.is_json else request.form.get("id")
    data = [l for l in data if l["id"] != link_id]
    write_links(LINKS_JSON, data)
    return "OK"

@links.route("/delete-link/<link_id>")
def delete_link_get(link_id):
    if not logged_in():
        return "Unauthorized", 401

    data = load_links(LINKS_JSON)
    data = [l for l in data if l["id"] != link_id]
    write_links(LINKS_JSON, data)
    return "OK"
