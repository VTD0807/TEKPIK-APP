@echo off
echo ====================================
echo  TEKPIK - Clean Install Script
echo ====================================
echo.
echo This will:
echo 1. Delete node_modules and .next folders
echo 2. Delete package-lock.json
echo 3. Reinstall all dependencies
echo.
echo This may take 2-3 minutes...
echo.
pause

cd /d "%~dp0"

echo.
echo [Step 1/4] Deleting .next folder...
if exist ".next" (
    rmdir /s /q ".next"
    echo Done!
) else (
    echo .next folder not found, skipping...
)

echo.
echo [Step 2/4] Deleting node_modules folder...
if exist "node_modules" (
    rmdir /s /q "node_modules"
    echo Done!
) else (
    echo node_modules folder not found, skipping...
)

echo.
echo [Step 3/4] Deleting package-lock.json...
if exist "package-lock.json" (
    del /q "package-lock.json"
    echo Done!
) else (
    echo package-lock.json not found, skipping...
)

echo.
echo [Step 4/4] Installing all dependencies...
call npm install

echo.
echo ====================================
echo  Installation Complete!
echo ====================================
echo.
echo You can now run: npm run dev
echo.
pause
