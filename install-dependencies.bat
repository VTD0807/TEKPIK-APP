@echo off
echo Installing missing dependencies...
echo.
cd /d "%~dp0"
call npm install
echo.
echo Done! Press any key to close...
pause > nul
