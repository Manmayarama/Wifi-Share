# routes/auth.py
from flask import Blueprint, request, session, redirect
from config import PASSWORD

auth = Blueprint("auth", __name__)

def logged_in():
    return session.get("ok")

@auth.route("/login", methods=["POST"])
def login():
    password = request.form.get("p", "")
    if password == PASSWORD:
        session["ok"] = True
    return redirect("/")

@auth.route("/logout")
def logout():
    session.clear()
    return redirect("/")
