@echo off
echo ========================================
echo Git Setup and Commit to GitHub
echo ========================================
echo.

REM Initialize Git
echo [1/5] Initializing Git repository...
git init
if %errorlevel% neq 0 (
    echo ERROR: Git is not installed or not in PATH
    echo Please restart PowerShell and try again
    pause
    exit /b 1
)

REM Configure Git
echo [2/5] Configuring Git user...
git config user.name "Gavin0099"
git config user.email "gavin@example.com"

REM Add files
echo [3/5] Adding files to Git...
git add .

REM Create commit
echo [4/5] Creating initial commit...
git commit -m "Initial commit: Working version with CORS fix, database loaded, stroke numbers display"

REM Add remote and push
echo [5/5] Connecting to GitHub...
git remote add origin https://github.com/Gavin0099/chinese-writing-practice.git
git branch -M main

echo.
echo ========================================
echo Ready to push to GitHub!
echo ========================================
echo.
echo To push to GitHub, run:
echo   git push -u origin main
echo.
echo If the repository already has content, run:
echo   git pull origin main --allow-unrelated-histories
echo   git push -u origin main
echo.
pause
