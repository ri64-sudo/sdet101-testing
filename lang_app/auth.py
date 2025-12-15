from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required, login_user, logout_user
from werkzeug.security import check_password_hash, generate_password_hash

from .extensions import db, mongo_db
from .models import User

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/set-language", methods=["POST"])
@login_required
def set_language():
    """Set the user's preferred learning language."""
    try:
        data = request.get_json() or {}
        language_code = data.get("language", "").strip().lower()
        
        if not language_code:
            return jsonify({"error": "Language code is required"}), 400
        
        # Validate language code (2-3 characters)
        if len(language_code) < 2 or len(language_code) > 3:
            return jsonify({"error": "Invalid language code"}), 400
        
        # Update user's preferred language
        current_user.preferred_language = language_code
        db.session.commit()
        
        return jsonify({
            "message": "Language preference updated",
            "preferred_language": language_code
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to update language: {str(e)}"}), 500


@auth_bp.route("/register", methods=["POST"])
def register():
    """Register a new user.

    - If MongoDB is configured, it is the primary store for user credentials.
    - A shadow SQL user row is kept for relationships (tasks, vocab).
    """
    try:
        data = request.get_json() or {}
        username = data.get("username", "").strip()
        email = data.get("email", "").strip()
        password = data.get("password", "")

        if not username or not email or not password:
            return jsonify({"error": "username, email, and password are required"}), 400

        # Check if database tables exist
        try:
            # Try to query the User table to see if it exists
            User.query.first()
        except Exception as db_error:
            error_msg = str(db_error)
            if "no such table" in error_msg.lower() or "doesn't exist" in error_msg.lower():
                return jsonify({
                    "error": "Database not initialized. Please run: flask --app lang_app.app:create_app init-db"
                }), 500
            # Re-raise if it's a different error
            raise

        # Check existing user in SQL (enforces existing unique constraints)
        try:
            existing_user = User.query.filter((User.username == username) | (User.email == email)).first()
            if existing_user:
                return jsonify({"error": "User already exists"}), 400
        except Exception as query_error:
            return jsonify({
                "error": f"Database query error: {str(query_error)}. Please ensure the database is initialized."
            }), 500

        password_hash = generate_password_hash(password)

        # Primary user store: MongoDB (if configured)
        mongo_user_id = None
        if mongo_db is not None:
            try:
                mongo_user = mongo_db.users.insert_one(
                    {
                        "username": username,
                        "email": email,
                        "password_hash": password_hash,
                        "created_at": datetime.utcnow(),
                    }
                )
                mongo_user_id = str(mongo_user.inserted_id)
            except Exception as mongo_error:
                # If MongoDB fails, continue with SQL-only registration
                pass

        # Shadow SQL user for relationships and Flask-Login
        try:
            user = User(username=username, email=email, password_hash=password_hash)
            db.session.add(user)
            db.session.commit()
        except Exception as commit_error:
            db.session.rollback()
            error_msg = str(commit_error)
            if "UNIQUE constraint" in error_msg or "duplicate" in error_msg.lower():
                return jsonify({"error": "Username or email already exists"}), 400
            return jsonify({
                "error": f"Database error: {error_msg}. Please check your database connection."
            }), 500

        # Back-link SQL id into Mongo for convenience (if Mongo is available)
        if mongo_db is not None and mongo_user_id is not None:
            try:
                mongo_db.users.update_one(
                    {"_id": mongo_user.inserted_id},
                    {"$set": {"sql_user_id": user.id}},
                )
            except Exception:
                # Non-critical error, continue
                pass

        login_user(user)
        
        # Send welcome email (non-blocking, don't fail registration if email fails)
        try:
            from .email_utils import send_welcome_email  # noqa: WPS433
            send_welcome_email(email, username)
        except Exception:
            # Email failure shouldn't prevent registration
            pass
        
        return (
            jsonify(
                {"message": "Registered", "user": {"id": user.id, "username": user.username}}
            ),
            201,
        )
    except Exception as e:
        import traceback
        import logging
        logger = logging.getLogger(__name__)
        logger.error("Registration error: %s", traceback.format_exc())
        return jsonify({
            "error": f"Registration failed: {str(e)}. Please check the server logs for details."
        }), 500


@auth_bp.route("/login", methods=["POST"])
def login():
    """Login using MongoDB as the primary credential store when available.

    Falls back to SQL-only auth if MongoDB is not configured.
    Also checks SQL if MongoDB check fails to handle password resets.
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
        
        # If MongoDB check failed, also check SQL (handles password resets)
        if not success:
            user = User.query.filter_by(username=username).first()
            if user and user.check_password(password):
                success = True
                # Sync password to MongoDB if it exists there
                if mongo_user:
                    try:
                        mongo_db.users.update_one(
                            {"username": username},
                            {"$set": {"password_hash": user.password_hash}}
                        )
                    except Exception:
                        pass  # Non-critical
    else:
        # Fallback: original SQL-based auth
        user = User.query.filter_by(username=username).first()
        if user and user.check_password(password):
            success = True

    # Record login attempt details in MongoDB if configured.
    if mongo_db is not None:
        try:
            mongo_db.login_events.insert_one(
                {
                    "username": username,
                    "success": success,
                    "timestamp": datetime.utcnow(),
                }
            )
        except Exception:
            pass  # Non-critical

    if not success or user is None:
        return jsonify({"error": "Invalid credentials"}), 401

    login_user(user)
    return jsonify({
        "message": "Logged in",
        "user": {
            "id": user.id,
            "username": user.username,
            "preferred_language": user.preferred_language
        }
    })


@auth_bp.route("/logout", methods=["POST"])
@login_required
def logout():
    logout_user()
    return jsonify({"message": "Logged out"})


@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    """Request password reset - verify user exists."""
    try:
        data = request.get_json() or {}
        username_or_email = data.get("username", "").strip()
        
        if not username_or_email:
            return jsonify({"error": "Username or email is required"}), 400
        
        # Find user by username or email
        user = User.query.filter(
            (User.username == username_or_email) | (User.email == username_or_email)
        ).first()
        
        if not user:
            # Don't reveal if user exists or not (security best practice)
            return jsonify({
                "message": "If an account exists with that username/email, a password reset link would be sent.",
                "success": True
            }), 200
        
        # For this learning project, we'll return success
        # In production, you'd send an email with a reset token
        return jsonify({
            "message": "Password reset request received",
            "success": True,
            "username": user.username  # Return username for the reset form
        }), 200
    except Exception as e:
        return jsonify({"error": f"Failed to process request: {str(e)}"}), 500


@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    """Reset user's password."""
    try:
        data = request.get_json() or {}
        username = data.get("username", "").strip()
        new_password = data.get("password", "")
        
        if not username or not new_password:
            return jsonify({"error": "Username and new password are required"}), 400
        
        if len(new_password) < 6:
            return jsonify({"error": "Password must be at least 6 characters"}), 400
        
        # Find user
        user = User.query.filter_by(username=username).first()
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Update password in SQL
        user.set_password(new_password)
        db.session.commit()
        
        # Update MongoDB if configured (sync after SQL commit to ensure consistency)
        if mongo_db is not None:
            try:
                # Check if user exists in MongoDB
                mongo_user = mongo_db.users.find_one({"username": username})
                if mongo_user:
                    # Update existing MongoDB user
                    mongo_db.users.update_one(
                        {"username": username},
                        {"$set": {"password_hash": user.password_hash}}
                    )
                else:
                    # Create MongoDB user if it doesn't exist (for consistency)
                    mongo_db.users.insert_one({
                        "username": username,
                        "email": user.email,
                        "password_hash": user.password_hash,
                        "sql_user_id": user.id,
                        "created_at": datetime.utcnow(),
                    })
            except Exception as e:
                # Log but don't fail - SQL is the source of truth
                print(f"Warning: Could not sync password to MongoDB: {e}")
                pass
        
        return jsonify({
            "message": "Password reset successfully. You can now login with your new password."
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to reset password: {str(e)}"}), 500

