# app.py
from flask import Flask
import secrets, os, socket

from config import PORT, SYSTEM_DIR
from routes.auth import auth
from routes.files import files_bp
from routes.links import links
from routes.views import views

import qrcode

app = Flask(__name__)
app.secret_key = secrets.token_hex(16)

# Import MAX_CONTENT_LENGTH from config
from config import MAX_CONTENT_LENGTH
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

# Ensure system directory exists
os.makedirs(SYSTEM_DIR, exist_ok=True)

# Register blueprints
app.register_blueprint(auth)
app.register_blueprint(files_bp)
app.register_blueprint(links)
app.register_blueprint(views)


def get_local_ip():
    """Get LAN IP address"""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    finally:
        s.close()


if __name__ == "__main__":
    ip = get_local_ip()
    url = f"http://{ip}:{PORT}"

    print("\n📱 Scan this QR code on your phone:\n")

    qr = qrcode.QRCode(border=1)
    qr.add_data(url)
    qr.make(fit=True)
    qr.print_ascii(invert=True)

    print(f"\n🌐 URL: {url}\n")

    app.run(host="0.0.0.0", port=PORT)
