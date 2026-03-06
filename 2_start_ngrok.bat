@echo off
title Virtual Interior Designer - ngrok Tunnel
color 0B
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                                                            ║
echo ║     Virtual Interior Designer - Public Access             ║
echo ║                                                            ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo [!] IMPORTANT: Make sure 1_start_app.bat is running first!
echo.
echo [✓] Starting ngrok tunnel...
echo [✓] Creating public URL...
echo.
echo ════════════════════════════════════════════════════════════
echo.
echo Copy the "Forwarding" URL and share with your friends!
echo Example: https://abc123.ngrok.io
echo.
echo ⚠️  KEEP THIS WINDOW OPEN!
echo.
echo ════════════════════════════════════════════════════════════
echo.
ngrok http 5000
