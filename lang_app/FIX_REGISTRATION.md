# Fix: Internal Server Error on Registration

## Quick Fix

The error is most likely because the database tables don't exist. Run this command:

```powershell
cd "C:\Users\ijazr\OneDrive\Documents\code\sdet101-testing\lang_app"
flask --app lang_app.app:create_app init-db
```

This will create the database tables needed for registration.

## Step-by-Step

1. **Open PowerShell** in the `lang_app` folder:
   ```powershell
   cd "C:\Users\ijazr\OneDrive\Documents\code\sdet101-testing\lang_app"
   ```

2. **Activate virtual environment** (if you have one):
   ```powershell
   .venv\Scripts\activate
   ```

3. **Initialize the database**:
   ```powershell
   flask --app lang_app.app:create_app init-db
   ```

4. **You should see**: `Database initialized.`

5. **Try registering again** in your browser

## If That Doesn't Work

### Check Flask Terminal Output

Look at the terminal where Flask is running. You should see a detailed error message like:
- `no such table: user`
- `Database connection error`
- `Table 'user' doesn't exist`

### Check Browser Console

1. Press **F12** in your browser
2. Go to **Console** tab
3. Look for red error messages
4. Go to **Network** tab
5. Try registering again
6. Click on `/api/auth/register`
7. Check the **Response** tab - it should now show a helpful error message

### Verify Database File Exists

Check if `lang_app/app.db` exists. If it doesn't, the init-db command will create it.

## What I Fixed

I added comprehensive error handling that will:
- Check if database tables exist
- Return helpful error messages instead of generic "Internal Server Error"
- Handle database connection errors gracefully
- Show specific error messages in the browser

After running `init-db`, registration should work!

