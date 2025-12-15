from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from .extensions import db
from .models import Task

tasks_bp = Blueprint("tasks", __name__)


@tasks_bp.route("/", methods=["GET"])
@login_required
def list_tasks():
    tasks = (
        Task.query.filter_by(user_id=current_user.id)
        .order_by(Task.created_at.desc())
        .all()
    )
    return jsonify(
        [
            {
                "id": task.id,
                "name": task.name,
                "due_date": task.due_date.isoformat() if task.due_date else None,
                "is_completed": task.is_completed,
            }
            for task in tasks
        ]
    )


@tasks_bp.route("/", methods=["POST"])
@login_required
def create_task():
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    due_date_raw = data.get("due_date")
    if not name:
        return jsonify({"error": "Task name required"}), 400

    due_date = None
    if due_date_raw:
        try:
            due_date = datetime.fromisoformat(due_date_raw).date()
        except ValueError:
            return jsonify({"error": "Invalid due_date format"}), 400

    task = Task(user_id=current_user.id, name=name, due_date=due_date)
    db.session.add(task)
    db.session.commit()
    return jsonify({"message": "Task created", "id": task.id}), 201


@tasks_bp.route("/<int:task_id>", methods=["PATCH"])
@login_required
def update_task(task_id):
    task = Task.query.filter_by(id=task_id, user_id=current_user.id).first_or_404()
    data = request.get_json() or {}

    if "name" in data:
        task.name = data["name"].strip()
    if "due_date" in data:
        if data["due_date"]:
            try:
                task.due_date = datetime.fromisoformat(data["due_date"]).date()
            except ValueError:
                return jsonify({"error": "Invalid due_date format"}), 400
        else:
            task.due_date = None
    if "is_completed" in data:
        task.is_completed = bool(data["is_completed"])

    db.session.commit()
    return jsonify({"message": "Task updated"})


@tasks_bp.route("/<int:task_id>", methods=["DELETE"])
@login_required
def delete_task(task_id):
    task = Task.query.filter_by(id=task_id, user_id=current_user.id).first_or_404()
    db.session.delete(task)
    db.session.commit()
    return jsonify({"message": "Task deleted"})

