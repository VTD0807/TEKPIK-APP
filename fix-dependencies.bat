@echo off
echo ====================================
echo  TEKPIK - Fix Dependencies
echo ====================================
echo.
echo Installing with --legacy-peer-deps flag...
echo This will ignore peer dependency conflicts.
echo.

cd /d "%~dp0"

call npm install --legacy-peer-deps

echo.
echo ====================================
echo  Installation Complete!
echo ====================================
echo.
echo You can now run: npm run dev
echo.
pause
