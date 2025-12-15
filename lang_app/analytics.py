from datetime import datetime, timedelta
from collections import defaultdict

from flask import Blueprint, jsonify
from flask_login import current_user, login_required
from sqlalchemy import and_

from .extensions import db
from .models import Task, VocabEntry

analytics_bp = Blueprint("analytics", __name__)


@analytics_bp.route("/dashboard", methods=["GET"])
@login_required
def dashboard():
    """Get comprehensive dashboard data for the current user."""
    try:
        # Task statistics
        all_tasks = Task.query.filter_by(user_id=current_user.id).all()
        completed_tasks = [t for t in all_tasks if t.is_completed]
        pending_tasks = [t for t in all_tasks if not t.is_completed]
        
        # Tasks by completion status
        task_completion_data = {
            "completed": len(completed_tasks),
            "pending": len(pending_tasks),
            "total": len(all_tasks)
        }
        
        # Tasks created over time (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_tasks = Task.query.filter(
            Task.user_id == current_user.id,
            Task.created_at >= thirty_days_ago
        ).all()
        
        tasks_by_date = defaultdict(int)
        for task in recent_tasks:
            if task.created_at:
                date_key = task.created_at.date().isoformat()
                tasks_by_date[date_key] += 1
        
        # Vocabulary statistics
        all_vocab = VocabEntry.query.filter_by(user_id=current_user.id).all()
        vocab_by_language = defaultdict(int)
        for entry in all_vocab:
            vocab_by_language[entry.target_language] += 1
        
        # Vocabulary growth over time (last 30 days)
        recent_vocab = VocabEntry.query.filter(
            VocabEntry.user_id == current_user.id,
            VocabEntry.created_at >= thirty_days_ago
        ).all()
        
        vocab_by_date = defaultdict(int)
        for entry in recent_vocab:
            if entry.created_at:
                date_key = entry.created_at.date().isoformat()
                vocab_by_date[date_key] += 1
        
        # Upcoming tasks (next 7 days)
        seven_days_ahead = datetime.utcnow().date() + timedelta(days=7)
        try:
            upcoming_tasks = Task.query.filter(
                and_(
                    Task.user_id == current_user.id,
                    Task.due_date.isnot(None),
                    Task.due_date <= seven_days_ahead,
                    Task.is_completed == False
                )
            ).order_by(Task.due_date).all()
        except Exception:
            # Fallback if there's an issue with the query
            upcoming_tasks = []
        
        return jsonify({
            "tasks": {
                "completion": task_completion_data,
                "created_over_time": dict(tasks_by_date),
                "upcoming": [
                    {
                        "id": t.id,
                        "name": t.name,
                        "due_date": t.due_date.isoformat() if t.due_date else None
                    }
                    for t in upcoming_tasks[:5]  # Limit to 5
                ]
            },
            "vocabulary": {
                "total": len(all_vocab),
                "by_language": dict(vocab_by_language),
                "learned_over_time": dict(vocab_by_date)
            },
            "summary": {
                "total_tasks": len(all_tasks),
                "completed_tasks": len(completed_tasks),
                "total_vocab_words": len(all_vocab),
                "languages_studied": len(vocab_by_language)
            }
        })
    except Exception as e:
        # Return error details for debugging
        import traceback
        import logging
        logger = logging.getLogger(__name__)
        logger.error("Dashboard error: %s", traceback.format_exc())
        
        error_msg = str(e)
        error_type = type(e).__name__
        
        # Return helpful error message
        return jsonify({
            "error": "Failed to load dashboard data",
            "type": error_type,
            "message": error_msg,
            "hint": "Make sure the database is initialized with 'flask --app lang_app.app:create_app init-db'"
        }), 500

