@echo off
echo Installing dependencies with --legacy-peer-deps flag...
cd /d "%~dp0"
npm install --legacy-peer-deps
echo.
echo Installation complete!
pause
