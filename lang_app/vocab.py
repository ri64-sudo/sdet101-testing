import os
from random import sample

import requests
from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from .extensions import db
from .models import VocabEntry

vocab_bp = Blueprint("vocab", __name__)

LIBRE_TRANSLATE_URL = os.environ.get(
    "LIBRE_TRANSLATE_URL", "https://libretranslate.de/translate"
)


@vocab_bp.route("/", methods=["GET"])
@login_required
def list_vocab():
    entries = (
        VocabEntry.query.filter_by(user_id=current_user.id)
        .order_by(VocabEntry.created_at.desc())
        .all()
    )
    return jsonify(
        [
            {
                "id": entry.id,
                "source_word": entry.source_word,
                "target_language": entry.target_language,
                "translated_word": entry.translated_word,
            }
            for entry in entries
        ]
    )


@vocab_bp.route("/", methods=["POST"])
@login_required
def add_vocab():
    data = request.get_json() or {}
    source_word = data.get("source_word", "").strip()
    target_language = data.get("target_language", "").strip()
    if not source_word or not target_language:
        return jsonify({"error": "source_word and target_language are required"}), 400

    translated_word = translate_word(source_word, target_language)
    if translated_word is None:
        return jsonify({"error": "Translation failed"}), 502

    entry = VocabEntry(
        user_id=current_user.id,
        source_word=source_word,
        target_language=target_language,
        translated_word=translated_word,
    )
    db.session.add(entry)
    db.session.commit()
    return jsonify({"message": "Added", "id": entry.id, "translated": translated_word})


@vocab_bp.route("/quiz", methods=["GET"])
@login_required
def quiz():
    entries = VocabEntry.query.filter_by(user_id=current_user.id).all()
    if not entries:
        return jsonify({"questions": []})
    questions = sample(entries, min(len(entries), 5))
    return jsonify(
        {
            "questions": [
                {
                    "id": entry.id,
                    "source_word": entry.source_word,
                    "target_language": entry.target_language,
                    "answer": entry.translated_word,
                }
                for entry in questions
            ]
        }
    )


def translate_word(text: str, target_language: str):
    """Translate using a LibreTranslate-compatible API."""
    payload = {"q": text, "source": "auto", "target": target_language}
    try:
        response = requests.post(LIBRE_TRANSLATE_URL, data=payload, timeout=10)
        if response.status_code != 200:
            return None
        data = response.json()
        return data.get("translatedText")
    except requests.RequestException:
        return None

