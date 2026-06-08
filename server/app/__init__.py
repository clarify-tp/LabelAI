"""
Label Padhega AI — Flask Application Factory
============================================
Creates and configures the Flask app with all extensions,
blueprints, and error handlers. Follows the Application Factory
pattern so the app can be instantiated multiple times (e.g. for testing).
"""

import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

# ─── Optional: rate limiting (Task 6) — degrades gracefully if missing ────────
try:
    from flask_limiter import Limiter
    from flask_limiter.util import get_remote_address
    _LIMITER_OK = True
except Exception:  # pragma: no cover - optional dependency
    _LIMITER_OK = False

# ─── Optional: Sentry error monitoring (Task 3G) — only active if DSN set ──────
try:
    import sentry_sdk
    from sentry_sdk.integrations.flask import FlaskIntegration
    _SENTRY_OK = True
except Exception:  # pragma: no cover - optional dependency
    _SENTRY_OK = False

# ─── Extension instances (initialised without app, bound in create_app) ───────
db = SQLAlchemy()
migrate = Migrate()

# Limiter is created here so routes can `from app import limiter` and decorate.
# When flask-limiter isn't installed, `limiter` is a no-op shim (see below).
if _LIMITER_OK:
    limiter = Limiter(
        key_func=get_remote_address,
        default_limits=["200 per day", "50 per hour"],
        storage_uri=os.getenv("REDIS_URL") or "memory://",
    )
else:
    class _NoopLimiter:
        """Fallback when flask-limiter is unavailable: decorators do nothing."""
        def limit(self, *_a, **_k):
            def deco(f):
                return f
            return deco

        def init_app(self, *_a, **_k):
            pass

    limiter = _NoopLimiter()


def create_app():
    """
    Application factory.
    Returns a fully configured Flask app instance.
    """
    # ── Sentry — initialise before app creation; no-op when SENTRY_DSN unset ──
    if _SENTRY_OK and os.getenv("SENTRY_DSN"):
        sentry_sdk.init(
            dsn=os.getenv("SENTRY_DSN"),
            integrations=[FlaskIntegration()],
            traces_sample_rate=0.1,
            environment=os.getenv("FLASK_ENV", "production"),
        )

    app = Flask(__name__)

    # ── Configuration ──────────────────────────────────────────────────────────
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret-change-me")
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv(
        "DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/labelpadhega"
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JSON_SORT_KEYS"] = False          # preserve key order in responses

    # ── CORS — allow React dev server and production frontend ──────────────────
    CORS(
        app,
        resources={r"/api/*": {"origins": [
            os.getenv("FRONTEND_URL", "http://localhost:5173"),
            "https://labelpadhega.netlify.app",   # update with real domain
        ]}},
        supports_credentials=True,
    )

    # ── Bind extensions ────────────────────────────────────────────────────────
    db.init_app(app)
    migrate.init_app(app, db)
    limiter.init_app(app)

    # ── Import models so Alembic/Flask-Migrate can detect them ─────────────────
    with app.app_context():
        from app.models import user, product, scan, chat, ingredient   # noqa: F401

    # ── Register blueprints ────────────────────────────────────────────────────
    from app.routes.auth      import auth_bp
    from app.routes.scan      import scan_bp
    from app.routes.product   import product_bp
    from app.routes.compare   import compare_bp
    from app.routes.profile   import profile_bp
    from app.routes.chat      import chat_bp
    from app.routes.health    import health_bp
    from app.routes.export    import export_bp
    from app.routes.feedback  import feedback_bp

    app.register_blueprint(auth_bp,     url_prefix="/api/auth")
    app.register_blueprint(scan_bp,     url_prefix="/api/scan")
    app.register_blueprint(product_bp,  url_prefix="/api/product")
    app.register_blueprint(compare_bp,  url_prefix="/api/compare")
    app.register_blueprint(profile_bp,  url_prefix="/api/profile")
    app.register_blueprint(chat_bp,     url_prefix="/api/chat")
    app.register_blueprint(health_bp,   url_prefix="/api")
    app.register_blueprint(export_bp,   url_prefix="/api/export")
    app.register_blueprint(feedback_bp, url_prefix="/api/feedback")

    # ── Global error handlers ──────────────────────────────────────────────────
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Route not found"}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({"error": "Method not allowed"}), 405

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({"error": "Internal server error"}), 500

    return app
