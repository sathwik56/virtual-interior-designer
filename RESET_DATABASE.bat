@echo off
echo ========================================
echo   RESET DATABASE - DELETE ALL USERS
echo ========================================
echo.
echo This will delete:
echo   - All user accounts
echo   - All saved designs
echo   - Everything in the database
echo.
echo Press Ctrl+C to cancel, or
pause

python reset_database.py

echo.
echo ========================================
echo Done! You can now create a new account.
echo ========================================
pause
