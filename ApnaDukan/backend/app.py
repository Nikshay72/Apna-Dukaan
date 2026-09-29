# app.py
# This is the main entry point for the ApnaDukan backend server.
# It creates the Flask app, connects all the routes, and starts the server.

import os
from flask import Flask, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables from .env file FIRST before anything else
load_dotenv()

# Import all route blueprints
from routes.interview import interview_bp
from routes.generate import generate_bp
from routes.publish import publish_bp
from routes.products import products_bp


def create_app():
    """
    Creates and configures the Flask application.
    Returns the configured app object.
    """
    app = Flask(
        __name__,
        static_folder="../frontend/out",      # Next.js static export (npm run build in /frontend)
        static_url_path=""
    )

    # Secret key for session (stores interview data between requests)
    # WARNING: Change this to a long random string in production!
    app.secret_key = os.environ.get("FLASK_SECRET_KEY", "apnadukan-secret-change-in-production")

    # Session config
    app.config["SESSION_TYPE"] = "filesystem"
    app.config["PERMANENT_SESSION_LIFETIME"] = 3600  # 1 hour

    # Allow cross-origin requests (needed for frontend to talk to backend)
    CORS(app, supports_credentials=True)

    # Register all route blueprints
    app.register_blueprint(interview_bp)
    app.register_blueprint(generate_bp)
    app.register_blueprint(publish_bp)
    app.register_blueprint(products_bp)

    # Serve uploaded product photos
    import os as _os
    from flask import send_from_directory as _sfd
    uploads_folder = _os.path.join(_os.path.dirname(__file__), "..", "uploads")
    _os.makedirs(uploads_folder, exist_ok=True)

    @app.route("/uploads/<path:filename>")
    def serve_upload(filename):
        """Serves uploaded product photos."""
        return _sfd(uploads_folder, filename)

    # ── STATIC FILE ROUTES ──

    FRONTEND_OUT = _os.path.join(_os.path.dirname(__file__), "..", "frontend", "out")

    def _page(name):
        """Serves a page from the Next.js export, with a helpful message if it hasn't been built yet."""
        if not _os.path.exists(_os.path.join(FRONTEND_OUT, name)):
            return (
                "<h2>Frontend not built yet</h2>"
                "<p>Run <code>npm install &amp;&amp; npm run build</code> inside the <code>frontend</code> folder, "
                "or use START.bat / start.sh which does it for you.</p>", 503
            )
        return send_from_directory(FRONTEND_OUT, name)

    @app.route("/")
    def index():
        """Serves the landing page."""
        return _page("index.html")

    @app.route("/onboard")
    def onboard():
        """Serves the interview + live preview page."""
        return _page("onboard.html")

    @app.route("/success")
    def success():
        """Serves the success page shown after publishing."""
        return _page("success.html")

    # /_next/*, /css/main.css and /js/products.js (used by generated shop sites)
    # are served automatically from the export folder by Flask's static handler.

    # ── HEALTH CHECK ──

    @app.route("/api/health")
    def health():
        """Simple health check endpoint — confirms the server is running."""
        return {"status": "ok", "app": "ApnaDukan", "version": "1.0.0"}

    return app


# Run the app
if __name__ == "__main__":
    app = create_app()

    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "true").lower() == "true"

    print(f"""
╔══════════════════════════════════════╗
║       🏪 ApnaDukan Server            ║
║  Running at http://localhost:{port}    ║
║  Press Ctrl+C to stop               ║
╚══════════════════════════════════════╝
    """)

    print("  >> Frontend: Next.js static export (frontend/out)")
    app.run(host="0.0.0.0", port=port, debug=debug)
