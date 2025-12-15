import logging
import os
from datetime import date, datetime

import requests
from flask_login import current_user

logger = logging.getLogger(__name__)

# Email service configuration
SENDGRID_API_KEY = os.environ.get("SENDGRID_API_KEY", "")
SENDGRID_FROM_EMAIL = os.environ.get("SENDGRID_FROM_EMAIL", "noreply@langapp.com")
EMAIL_ENABLED = bool(SENDGRID_API_KEY)


def send_email_via_sendgrid(to_email: str, subject: str, html_content: str) -> bool:
    """Send email using SendGrid API."""
    if not EMAIL_ENABLED:
        logger.info("Email disabled (no SENDGRID_API_KEY). Would send: %s", subject)
        return False
    
    try:
        response = requests.post(
            "https://api.sendgrid.com/v3/mail/send",
            headers={
                "Authorization": f"Bearer {SENDGRID_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "personalizations": [{"to": [{"email": to_email}]}],
                "from": {"email": SENDGRID_FROM_EMAIL},
                "subject": subject,
                "content": [{"type": "text/html", "value": html_content}],
            },
            timeout=10,
        )
        return response.status_code == 202
    except requests.RequestException as e:
        logger.error("SendGrid error: %s", e)
        return False


def send_task_reminder(task_name: str, due_date: date, recipient_email: str) -> None:
    """Send task reminder email."""
    days_until = (due_date - date.today()).days
    urgency = "urgent" if days_until <= 1 else "upcoming"
    
    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #667eea;">Task Reminder</h2>
        <p>Hello!</p>
        <p>This is a reminder about your task: <strong>{task_name}</strong></p>
        <p><strong>Due Date:</strong> {due_date.strftime('%B %d, %Y')}</p>
        <p><strong>Days Remaining:</strong> {days_until} day(s)</p>
        <p style="margin-top: 20px; color: #666;">Log in to your Language Learning Platform to manage your tasks.</p>
    </body>
    </html>
    """
    
    subject = f"Reminder: {task_name} due in {days_until} day(s)"
    
    if send_email_via_sendgrid(recipient_email, subject, html_content):
        logger.info("Email reminder sent to %s for task %s", recipient_email, task_name)
    else:
        logger.info("Email reminder logged (not sent) -> to=%s | task=%s | due=%s",
                   recipient_email, task_name, due_date)


def send_learning_milestone(recipient_email: str, milestone_type: str, count: int) -> None:
    """Send learning milestone notification."""
    milestones = {
        "vocab_10": ("10 Words Learned!", "Congratulations! You've learned 10 vocabulary words."),
        "vocab_50": ("50 Words Learned!", "Amazing progress! You've learned 50 vocabulary words."),
        "vocab_100": ("100 Words Learned!", "Outstanding! You've reached 100 vocabulary words!"),
        "tasks_10": ("10 Tasks Completed!", "Great job! You've completed 10 tasks."),
        "languages_3": ("3 Languages!", "Impressive! You're learning 3 different languages."),
    }
    
    title, message = milestones.get(milestone_type, ("Milestone Reached!", f"You've reached {count}!"))
    
    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #48bb78;">🎉 {title}</h2>
        <p>Hello!</p>
        <p>{message}</p>
        <p style="margin-top: 20px; color: #666;">Keep up the great work on your language learning journey!</p>
    </body>
    </html>
    """
    
    subject = f"🎉 {title}"
    
    if send_email_via_sendgrid(recipient_email, subject, html_content):
        logger.info("Milestone email sent to %s: %s", recipient_email, milestone_type)
    else:
        logger.info("Milestone email logged (not sent) -> to=%s | milestone=%s",
                   recipient_email, milestone_type)


def send_welcome_email(recipient_email: str, username: str) -> None:
    """Send welcome email to new users."""
    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #667eea;">Welcome to Language Learning Platform!</h2>
        <p>Hello {username}!</p>
        <p>Thank you for joining our language learning platform. You're all set to start your learning journey!</p>
        <p>Here's what you can do:</p>
        <ul>
            <li>📚 Build your vocabulary with translations</li>
            <li>✅ Manage your learning tasks</li>
            <li>🧩 Test your knowledge with quizzes</li>
            <li>📊 Track your progress with analytics</li>
        </ul>
        <p style="margin-top: 20px;">Happy learning!</p>
    </body>
    </html>
    """
    
    subject = "Welcome to Language Learning Platform!"
    
    if send_email_via_sendgrid(recipient_email, subject, html_content):
        logger.info("Welcome email sent to %s", recipient_email)
    else:
        logger.info("Welcome email logged (not sent) -> to=%s", recipient_email)


