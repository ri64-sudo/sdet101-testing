from flask_login import LoginManager
from flask_sqlalchemy import SQLAlchemy
from pymongo import MongoClient

db = SQLAlchemy()
login_manager = LoginManager()
login_manager.login_view = "auth.login"

mongo_client: MongoClient | None = None
mongo_db = None


def init_mongo(app):
    """Initialize a MongoDB client and attach the database handle."""
    global mongo_client, mongo_db

    mongo_uri = app.config.get("MONGO_URI")
    if not mongo_uri:
        # If no URI is set, skip Mongo initialization (keeps it optional)
        return

    mongo_client = MongoClient(mongo_uri)

    # If DB name not explicitly set, infer from URI path (mongodb://host/db_name)
    db_name = app.config.get("MONGO_DB_NAME")
    if not db_name:
        db_name = mongo_uri.rsplit("/", 1)[-1] or "lang_app"

    mongo_db = mongo_client[db_name]

