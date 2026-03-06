@echo off
title Backup Virtual Interior Designer
color 0A
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                                                            ║
echo ║          Creating Backup of Your Project...               ║
echo ║                                                            ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

REM Get current date and time for backup folder name
set TIMESTAMP=%date:~-4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%

REM Create backup folder on Desktop
set BACKUP_PATH=%USERPROFILE%\Desktop\VirtualDesigner_Backup_%TIMESTAMP%

echo Creating backup folder: %BACKUP_PATH%
mkdir "%BACKUP_PATH%"

echo.
echo Copying files...
echo.

REM Copy important files and folders
xcopy /E /I /Y "templates" "%BACKUP_PATH%\templates"
xcopy /E /I /Y "static" "%BACKUP_PATH%\static"
xcopy /Y "*.py" "%BACKUP_PATH%"
xcopy /Y "*.txt" "%BACKUP_PATH%"
xcopy /Y "*.bat" "%BACKUP_PATH%"
xcopy /Y "*.md" "%BACKUP_PATH%"
xcopy /E /I /Y "instance" "%BACKUP_PATH%\instance"

echo.
echo ════════════════════════════════════════════════════════════
echo.
echo ✓ Backup Complete!
echo.
echo Backup saved to: %BACKUP_PATH%
echo.
echo You can find it on your Desktop.
echo.
pause
