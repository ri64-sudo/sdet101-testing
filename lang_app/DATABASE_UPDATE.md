# Database Update: Adding Preferred Language

## Important: Database Migration Required

The User model now includes a `preferred_language` field. You need to update your database.

### Option 1: Recreate Database (Development - Data will be lost)

If you're in development and don't mind losing existing data:

```powershell
cd "C:\Users\ijazr\OneDrive\Documents\code\sdet101-testing\lang_app"
# Delete the old database
del app.db
# Recreate with new schema
python -m flask --app lang_app.app:create_app init-db
```

### Option 2: Add Column Manually (Keep existing data)

If you want to keep existing user data, add the column manually:

```powershell
cd "C:\Users\ijazr\OneDrive\Documents\code\sdet101-testing\lang_app"
python -c "from lang_app.app import create_app; from lang_app.extensions import db; app = create_app(); app.app_context().push(); db.engine.execute('ALTER TABLE user ADD COLUMN preferred_language VARCHAR(10)'); print('Column added successfully')"
```

### Option 3: Use Flask-Migrate (Recommended for Production)

For production, use Flask-Migrate for proper migrations.

## What Changed

- Added `preferred_language` column to User table
- Users can now select their learning language after login
- Language preference is stored in the database
- Vocabulary form uses preferred language by default

