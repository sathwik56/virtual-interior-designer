@echo off
title Virtual Interior Designer - App Server
color 0A
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                                                            ║
echo ║     Virtual Interior Designer - Starting...               ║
echo ║                                                            ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo [✓] Starting Flask application...
echo [✓] Local access: http://localhost:5000
echo [✓] Network access: http://192.168.1.4:5000
echo.
echo ⚠️  KEEP THIS WINDOW OPEN!
echo.
echo ════════════════════════════════════════════════════════════
echo.
python app.py
