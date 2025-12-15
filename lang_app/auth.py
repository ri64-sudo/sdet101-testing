from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_login import login_required, login_user, logout_user
from werkzeug.security import check_password_hash, generate_password_hash

from .extensions import db, mongo_db
from .models import User

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
def register():
    """Register a new user.

    - If MongoDB is configured, it is the primary store for user credentials.
    - A shadow SQL user row is kept for relationships (tasks, vocab).
    """
    data = request.get_json() or {}
    username = data.get("username", "").strip()
    email = data.get("email", "").strip()
    password = data.get("password", "")

    if not username or not email or not password:
        return jsonify({"error": "username, email, and password are required"}), 400

    # Check existing user in SQL (enforces existing unique constraints)
    if User.query.filter((User.username == username) | (User.email == email)).first():
        return jsonify({"error": "User already exists"}), 400

    password_hash = generate_password_hash(password)

    # Primary user store: MongoDB (if configured)
    mongo_user_id = None
    if mongo_db is not None:
        mongo_user = mongo_db.users.insert_one(
            {
                "username": username,
                "email": email,
                "password_hash": password_hash,
                "created_at": datetime.utcnow(),
            }
        )
        mongo_user_id = str(mongo_user.inserted_id)

    # Shadow SQL user for relationships and Flask-Login
    user = User(username=username, email=email, password_hash=password_hash)
    db.session.add(user)
    db.session.commit()

    # Back-link SQL id into Mongo for convenience (if Mongo is available)
    if mongo_db is not None and mongo_user_id is not None:
        mongo_db.users.update_one(
            {"_id": mongo_user.inserted_id},
            {"$set": {"sql_user_id": user.id}},
        )

    login_user(user)
    
    # Send welcome email
    from .email_utils import send_welcome_email  # noqa: WPS433
    send_welcome_email(email, username)
    
    return (
        jsonify(
            {"message": "Registered", "user": {"id": user.id, "username": user.username}}
        ),
        201,
    )


@auth_bp.route("/login", methods=["POST"])
def login():
    """Login using MongoDB as the primary credential store when available.

    Falls back to SQL-only auth if MongoDB is not configured.
    """
    data = request.get_json() or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")

    success = False
    user = None

    if mongo_db is not None:
        # Primary: check MongoDB credentials
        mongo_user = mongo_db.users.find_one({"username": username})
        if mongo_user and check_password_hash(mongo_user.get("password_hash", ""), password):
            success = True
            # Ensure there is a corresponding SQL user row
            user = User.query.filter_by(username=username).first()
            if not user:
                user = User(
                    username=username,
                    email=mongo_user.get("email", ""),
                    password_hash=mongo_user.get("password_hash", ""),
                )
                db.session.add(user)
                db.session.commit()

            # Keep sql_user_id up to date
            if "sql_user_id" not in mongo_user or mongo_user["sql_user_id"] != user.id:
                mongo_db.users.update_one(
                    {"_id": mongo_user["_id"]},
                    {"$set": {"sql_user_id": user.id}},
                )
    else:
        # Fallback: original SQL-based auth
        user = User.query.filter_by(username=username).first()
        if user and user.check_password(password):
            success = True

    # Record login attempt details in MongoDB if configured.
    if mongo_db is not None:
        mongo_db.login_events.insert_one(
            {
                "username": username,
                "success": success,
                "timestamp": datetime.utcnow(),
            }
        )

    if not success or user is None:
        return jsonify({"error": "Invalid credentials"}), 401

    login_user(user)
    return jsonify({"message": "Logged in", "user": {"id": user.id, "username": user.username}})


@auth_bp.route("/logout", methods=["POST"])
@login_required
def logout():
    logout_user()
    return jsonify({"message": "Logged out"})

