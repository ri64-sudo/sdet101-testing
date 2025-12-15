# Troubleshooting Guide

## Internal Server Error

If you're seeing an "Internal Server Error", follow these steps:

### 1. Check Flask Error Output

When running Flask, you should see the actual error in the terminal. Look for a traceback that shows:
- Which file has the error
- Which line number
- What the error message is

### 2. Common Issues and Fixes

#### Issue: Database Not Initialized

**Symptoms**: Error about tables not existing

**Fix**:
```bash
cd lang_app
flask --app lang_app.app:create_app init-db
```

#### Issue: Missing Dependencies

**Symptoms**: `ModuleNotFoundError` or `ImportError`

**Fix**:
```bash
pip install -r requirements.txt
```

#### Issue: Analytics Route Error

**Symptoms**: Error when loading dashboard

**Fix**: The analytics route now has better error handling. Check the browser console (F12) for the actual error message.

### 3. Enable Debug Mode

Make sure Flask is running in debug mode to see detailed errors:

```bash
flask --app lang_app.app:create_app run --debug
```

### 4. Check Browser Console

1. Open browser developer tools (F12)
2. Go to Console tab
3. Look for JavaScript errors
4. Go to Network tab
5. Click on the failed request (usually `/api/analytics/dashboard`)
6. Check the Response tab for error details

### 5. Verify Database

Check if the database file exists and has tables:

```bash
# On Windows PowerShell
python -c "from lang_app.app import create_app; from lang_app.extensions import db; app = create_app(); app.app_context().push(); print('Tables:', db.metadata.tables.keys())"
```

### 6. Reset Database (if needed)

If the database is corrupted:

```bash
# Delete the database file
rm lang_app/app.db  # Linux/Mac
del lang_app\app.db  # Windows

# Reinitialize
flask --app lang_app.app:create_app init-db
```

### 7. Check User Authentication

Make sure you're logged in before accessing the dashboard. The dashboard route requires authentication.

### 8. Common Error Messages

- **"Table 'task' doesn't exist"**: Run `init-db` command
- **"No module named 'flask'"**: Install requirements
- **"current_user.id" AttributeError**: Make sure you're logged in
- **"SQLAlchemy query error"**: Check database connection

### 9. Test Individual Routes

Test if the app starts:

```bash
flask --app lang_app.app:create_app run --debug
```

Then test routes:
- `http://127.0.0.1:5000/` - Should show login page
- `http://127.0.0.1:5000/api/me` - Should return `{"authenticated": false}`

### 10. Get Help

If you're still stuck, share:
1. The full error traceback from Flask terminal
2. The browser console errors (F12)
3. The Network tab response for `/api/analytics/dashboard`

