import json
from datetime import datetime
from random import choice, sample, shuffle

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from .extensions import db
from .models import Assignment, VocabEntry

assignments_bp = Blueprint("assignments", __name__)


@assignments_bp.route("/", methods=["GET"])
@login_required
def list_assignments():
    """List all assignments for the current user."""
    assignments = (
        Assignment.query.filter_by(user_id=current_user.id)
        .order_by(Assignment.created_at.desc())
        .all()
    )
    return jsonify(
        [
            {
                "id": a.id,
                "title": a.title,
                "description": a.description,
                "type": a.assignment_type,
                "language": a.language,
                "is_completed": a.is_completed,
                "score": a.score,
                "created_at": a.created_at.isoformat() if a.created_at else None,
                "completed_at": a.completed_at.isoformat() if a.completed_at else None,
            }
            for a in assignments
        ]
    )


@assignments_bp.route("/generate", methods=["POST"])
@login_required
def generate_assignment():
    """Generate a new assignment based on user's vocabulary."""
    data = request.get_json() or {}
    assignment_type = data.get("type", "translation")  # basic, translation, fill_blank, multiple_choice
    language = data.get("language") or current_user.preferred_language
    
    if not language:
        return jsonify({"error": "No language selected. Please select a learning language first."}), 400
    
    # Basic assignments don't require vocabulary
    if assignment_type == "basic":
        pass  # Skip vocabulary check
    else:
        # Get user's vocabulary for the language
        vocab_entries = VocabEntry.query.filter_by(
            user_id=current_user.id,
            target_language=language
        ).all()
        
        if len(vocab_entries) < 3:
            return jsonify({
                "error": f"Not enough vocabulary words. Add at least 3 words in {language.upper()} to generate assignments."
            }), 400
    
    # Get vocabulary entries if needed (not for basic)
    vocab_entries = []
    if assignment_type != "basic":
        vocab_entries = VocabEntry.query.filter_by(
            user_id=current_user.id,
            target_language=language
        ).all()
    
    # Generate assignment based on type
    if assignment_type == "basic":
        assignment = _generate_basic_assignment(language)
    elif assignment_type == "translation":
        assignment = _generate_translation_assignment(vocab_entries, language)
    elif assignment_type == "fill_blank":
        assignment = _generate_fill_blank_assignment(vocab_entries, language)
    elif assignment_type == "multiple_choice":
        assignment = _generate_multiple_choice_assignment(vocab_entries, language)
    else:
        return jsonify({"error": "Invalid assignment type"}), 400
    
    # Save assignment to database
    db_assignment = Assignment(
        user_id=current_user.id,
        title=assignment["title"],
        description=assignment.get("description"),
        assignment_type=assignment_type,
        language=language,
        content=json.dumps(assignment["content"]),
    )
    db.session.add(db_assignment)
    db.session.commit()
    
    return jsonify({
        "id": db_assignment.id,
        "title": assignment["title"],
        "type": assignment_type,
        "content": assignment["content"],
    }), 201


@assignments_bp.route("/<int:assignment_id>", methods=["GET"])
@login_required
def get_assignment(assignment_id):
    """Get a specific assignment with its content."""
    assignment = Assignment.query.filter_by(
        id=assignment_id,
        user_id=current_user.id
    ).first_or_404()
    
    return jsonify({
        "id": assignment.id,
        "title": assignment.title,
        "description": assignment.description,
        "type": assignment.assignment_type,
        "language": assignment.language,
        "content": json.loads(assignment.content),
        "is_completed": assignment.is_completed,
        "score": assignment.score,
    })


@assignments_bp.route("/<int:assignment_id>/submit", methods=["POST"])
@login_required
def submit_assignment(assignment_id):
    """Submit answers for an assignment and calculate score."""
    assignment = Assignment.query.filter_by(
        id=assignment_id,
        user_id=current_user.id
    ).first_or_404()
    
    if assignment.is_completed:
        return jsonify({"error": "Assignment already completed"}), 400
    
    data = request.get_json() or {}
    answers = data.get("answers", {})
    
    # Load assignment content
    content = json.loads(assignment.content)
    correct_answers = content.get("answers", {})
    
    # Calculate score
    total = len(correct_answers)
    correct = 0
    
    for question_id, user_answer in answers.items():
        correct_answer = correct_answers.get(str(question_id), "")
        # Normalize answers for comparison
        if str(user_answer).strip().lower() == str(correct_answer).strip().lower():
            correct += 1
    
    score = (correct / total * 100) if total > 0 else 0
    
    # Update assignment
    assignment.is_completed = True
    assignment.score = score
    assignment.completed_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({
        "message": "Assignment submitted",
        "score": round(score, 1),
        "correct": correct,
        "total": total,
        "feedback": _generate_feedback(correct, total, score)
    })


def _generate_translation_assignment(vocab_entries, language):
    """Generate a translation assignment."""
    selected_words = sample(vocab_entries, min(5, len(vocab_entries)))
    
    questions = {}
    answers = {}
    
    for idx, entry in enumerate(selected_words, 1):
        questions[str(idx)] = {
            "question": f"Translate '{entry.source_word}' to {language.upper()}",
            "hint": f"English word: {entry.source_word}"
        }
        answers[str(idx)] = entry.translated_word
    
    return {
        "title": f"Translation Practice - {language.upper()}",
        "description": "Translate the following words to your target language",
        "content": {
            "questions": questions,
            "answers": answers
        }
    }


def _generate_fill_blank_assignment(vocab_entries, language):
    """Generate a fill-in-the-blank assignment."""
    selected_words = sample(vocab_entries, min(5, len(vocab_entries)))
    
    questions = {}
    answers = {}
    
    sentences = [
        "I want to learn the word: _____",
        "The translation of this word is: _____",
        "Can you tell me what _____ means?",
        "I need to practice: _____",
        "This word in {lang} is: _____"
    ]
    
    for idx, entry in enumerate(selected_words, 1):
        sentence_template = choice(sentences)
        if "{lang}" in sentence_template:
            sentence = sentence_template.replace("{lang}", language.upper())
        else:
            sentence = sentence_template
        
        # Randomly decide if we're asking for source or translation
        if idx % 2 == 0:
            # Ask for translation
            question_text = sentence.replace("_____", f"'{entry.source_word}'")
            answer = entry.translated_word
        else:
            # Ask for source word
            question_text = sentence.replace("_____", f"'{entry.translated_word}'")
            answer = entry.source_word
        
        questions[str(idx)] = {
            "question": question_text,
            "blank_position": "end"
        }
        answers[str(idx)] = answer
    
    return {
        "title": f"Fill in the Blank - {language.upper()}",
        "description": "Complete the sentences with the correct words",
        "content": {
            "questions": questions,
            "answers": answers
        }
    }


def _generate_multiple_choice_assignment(vocab_entries, language):
    """Generate a multiple choice assignment."""
    selected_words = sample(vocab_entries, min(5, len(vocab_entries)))
    
    questions = {}
    answers = {}
    
    for idx, entry in enumerate(selected_words, 1):
        # Get wrong answers (distractors)
        other_entries = [e for e in vocab_entries if e.id != entry.id]
        wrong_answers = sample(other_entries, min(3, len(other_entries)))
        
        # Create options
        options = [entry.translated_word] + [e.translated_word for e in wrong_answers]
        shuffle(options)
        
        correct_index = options.index(entry.translated_word)
        
        questions[str(idx)] = {
            "question": f"What is the {language.upper()} translation of '{entry.source_word}'?",
            "options": options
        }
        answers[str(idx)] = correct_index  # Index of correct answer
    
    return {
        "title": f"Multiple Choice - {language.upper()}",
        "description": "Choose the correct translation for each word",
        "content": {
            "questions": questions,
            "answers": answers
        }
    }


def _generate_basic_assignment(language):
    """Generate a basic starter assignment with common words."""
    # Common starter words for any language
    basic_words = {
        "hello": "Hello",
        "thank you": "Thank you",
        "yes": "Yes",
        "no": "No",
        "please": "Please",
        "goodbye": "Goodbye",
        "sorry": "Sorry",
        "excuse me": "Excuse me",
        "water": "Water",
        "food": "Food"
    }
    
    # Try to get translations using the translation API
    from .vocab import translate_word
    
    questions = {}
    answers = {}
    
    for idx, (english_word, _) in enumerate(list(basic_words.items())[:5], 1):
        try:
            # Translate the word
            translated = translate_word(english_word, language)
            questions[str(idx)] = {
                "question": f"Translate '{english_word}' to {language.upper()}",
                "hint": f"English: {english_word}"
            }
            answers[str(idx)] = translated
        except Exception:
            # Fallback if translation fails
            questions[str(idx)] = {
                "question": f"Learn the word: '{english_word}'",
                "hint": f"Practice saying: {english_word}"
            }
            answers[str(idx)] = english_word  # Accept English as answer for now
    
    return {
        "title": f"Basic {language.upper()} Starter - Welcome!",
        "description": "Start your language learning journey with these essential words",
        "content": {
            "questions": questions,
            "answers": answers
        }
    }


def _generate_feedback(correct, total, score):
    """Generate feedback message based on score."""
    if score >= 90:
        return "Excellent work! 🌟"
    elif score >= 70:
        return "Good job! Keep practicing! 👍"
    elif score >= 50:
        return "Not bad! Review and try again. 💪"
    else:
        return "Keep practicing! You'll improve! 📚"

