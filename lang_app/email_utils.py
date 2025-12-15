import logging
from datetime import date

from flask_login import current_user

logger = logging.getLogger(__name__)


def send_task_reminder(task_name: str, due_date: date, recipient_email: str) -> None:
    """Placeholder email sender. Logs the payload instead of sending."""
    logger.info(
        "Email reminder -> to=%s | task=%s | due=%s",
        recipient_email,
        task_name,
        due_date,
    )

