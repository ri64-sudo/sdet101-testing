# Language Learning + Tasks (Flask)

Quick-start
1. Create virtual env (optional) and install deps:
   ```bash
   python -m venv .venv
   .venv\\Scripts\\activate  # Windows
   pip install -r requirements.txt
   ```
2. Initialize database:
   ```bash
   flask --app lang_app.app:create_app init-db
   ```
3. Run dev server:
   ```bash
   flask --app lang_app.app:create_app run --debug
   ```
4. Open http://127.0.0.1:5000 to use the app.

Notes
- Auth handled with Flask-Login; passwords hashed via Werkzeug.
- Translation uses LibreTranslate (default endpoint `https://libretranslate.de/translate`). Override with `LIBRE_TRANSLATE_URL` env var if needed.
- Email reminders are stubbed in `email_utils.py` (logs only).
- SQLite database lives at `lang_app/app.db` by default; override via `DATABASE_URL`.

