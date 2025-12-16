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

    # Log the translation attempt for debugging
    print(f"[VOCAB] Attempting to translate '{source_word}' to {target_language}")

    translated_word = translate_word(source_word, target_language)
    
    if translated_word is None:
        error_msg = (
            f"Translation failed for '{source_word}' to {target_language}. "
            "Possible reasons:\n"
            "- Internet connection issues\n"
            "- Translation API temporarily unavailable\n"
            "- Unsupported language pair\n"
            "Please check your internet connection and try again."
        )
        print(f"[VOCAB] Translation failed: {error_msg}")
        return jsonify({"error": error_msg}), 502

    print(f"[VOCAB] Successfully translated '{source_word}' → '{translated_word}'")

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
    # Try multiple API endpoints
    api_endpoints = [
        LIBRE_TRANSLATE_URL,
        "https://libretranslate.com/translate",
        "https://libretranslate.de/translate"
    ]
    
    payload = {"q": text, "source": "auto", "target": target_language}
    headers = {"Content-Type": "application/json"}
    
    # Try each endpoint
    for endpoint in api_endpoints:
        try:
            # Try JSON format
            response = requests.post(endpoint, json=payload, headers=headers, timeout=15)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    translated = data.get("translatedText")
                    if translated:
                        return translated
                except ValueError:
                    # Response is not JSON
                    pass
            
            # If JSON failed, try form data
            response = requests.post(endpoint, data=payload, timeout=15)
            if response.status_code == 200:
                try:
                    data = response.json()
                    translated = data.get("translatedText")
                    if translated:
                        return translated
                except ValueError:
                    pass
            
            # Log non-200 responses
            if response.status_code != 200:
                print(f"Translation failed on {endpoint}: Status {response.status_code}, Response: {response.text[:200]}")
                
        except requests.exceptions.Timeout:
            print(f"Translation timeout on {endpoint} for '{text}' to {target_language}")
            continue
        except requests.exceptions.ConnectionError:
            print(f"Translation connection error on {endpoint} for '{text}' to {target_language}")
            continue
        except requests.RequestException as e:
            print(f"Translation error on {endpoint}: {str(e)}")
            continue
        except Exception as e:
            print(f"Unexpected translation error on {endpoint}: {str(e)}")
            continue
    
    # If all endpoints failed, try a simple fallback translation dictionary
    print(f"All translation endpoints failed for '{text}' to {target_language}")
    return None

