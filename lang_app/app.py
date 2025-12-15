import os

from flask import Flask, jsonify, render_template
from flask_login import current_user

from .extensions import db, init_mongo, login_manager


def create_app(test_config=None):
    app = Flask(__name__, static_folder="static", template_folder="templates")
    app.config.update(
        SECRET_KEY=os.environ.get("SECRET_KEY", "dev-secret-key"),
        SQLALCHEMY_DATABASE_URI=os.environ.get(
            "DATABASE_URL", f"sqlite:///{os.path.join(app.root_path, 'app.db')}"
        ),
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        # Optional MongoDB support; override via env if you want to use it.
        MONGO_URI=os.environ.get("MONGO_URI", ""),
        MONGO_DB_NAME=os.environ.get("MONGO_DB_NAME", "lang_app"),
    )
    if test_config:
        app.config.update(test_config)

    db.init_app(app)
    login_manager.init_app(app)
    init_mongo(app)

    # Import models so Flask-Login can load them
    from .models import User  # noqa: WPS433

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    # Blueprints
    from .auth import auth_bp  # noqa: WPS433
    from .tasks import tasks_bp  # noqa: WPS433
    from .vocab import vocab_bp  # noqa: WPS433

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(tasks_bp, url_prefix="/api/tasks")
    app.register_blueprint(vocab_bp, url_prefix="/api/vocab")

    @app.route("/")
    def index():
        return render_template("index.html")

    @app.route("/api/me")
    def me():
        if not current_user.is_authenticated:
            return jsonify({"authenticated": False}), 200
        return jsonify(
            {
                "authenticated": True,
                "user": {
                    "id": current_user.id,
                    "username": current_user.username,
                    "email": current_user.email,
                },
            }
        )

    @app.cli.command("init-db")
    def init_db():
        """Initialize the SQLite database."""
        with app.app_context():
            db.create_all()
            print("Database initialized.")

    return app


if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        db.create_all()
    app.run(debug=True)

