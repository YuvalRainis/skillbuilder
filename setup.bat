@echo off
REM Setup script for SkillBuilder - Handles API key configuration and starts the system

setlocal enabledelayedexpansion

echo.
echo ========================================
echo   SkillBuilder Setup
echo ========================================
echo.

REM Check if backend/.env exists
if not exist "backend\.env" (
    echo Error: backend\.env not found!
    echo Please ensure you're running this from the project root directory.
    pause
    exit /b 1
)

REM Check if API key is already set
for /f "tokens=2 delims==" %%A in ('findstr "GROQ_API_KEY=" backend\.env') do (
    set "API_KEY=%%A"
)

if not "!API_KEY!"=="" (
    echo ✓ API key already configured
    echo.
    goto start_system
)

echo No API key found. Let's set it up!
echo.
echo ✓ Get your Groq API key from: https://console.groq.com/keys
echo.

:prompt_key
set /p USER_KEY="Paste your Groq API key here: "

if "!USER_KEY!"=="" (
    echo Error: API key cannot be empty!
    goto prompt_key
)

echo.
echo Testing API key...

REM Create a Python test script
(
    echo import os
    echo import sys
    echo api_key = sys.argv[1]
    echo os.environ['GROQ_API_KEY'] = api_key
    echo try:
    echo     from groq import Groq
    echo     client = Groq(api_key=api_key)
    echo     response = client.chat.completions.create(
    echo         model="llama-3.1-8b-instant",
    echo         messages=[{"role": "user", "content": "Say test"}],
    echo         max_tokens=10
    echo     )
    echo     print("SUCCESS")
    echo except Exception as e:
    echo     print("FAILED")
    echo     print(str(e))
) > backend\test_key.py

cd backend
python test_key.py "!USER_KEY!" > test_output.txt 2>&1
set /p TEST_RESULT=<test_output.txt
cd ..

if "!TEST_RESULT!"=="SUCCESS" (
    echo ✓ API key is valid!
) else (
    echo ✗ API key test failed. Please check your key and try again.
    if exist backend\test_key.py del backend\test_key.py
    if exist backend\test_output.txt del backend\test_output.txt
    goto prompt_key
)

REM Update the .env file with the new key
echo Saving API key to backend\.env...
(
    echo GROQ_API_KEY=!USER_KEY!
) > backend\.env

REM Clean up test files
if exist backend\test_key.py del backend\test_key.py
if exist backend\test_output.txt del backend\test_output.txt

echo ✓ API key saved successfully!
echo.

:start_system
echo.
echo ========================================
echo   Starting SkillBuilder System
echo ========================================
echo.

REM Check if Node modules are installed
if not exist "frontend\node_modules" (
    echo Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
)

REM Check if Python dependencies are installed
echo Installing backend dependencies...
cd backend
call pip install -r requirements.txt -q
cd ..

echo.
echo ✓ All dependencies installed!
echo.
echo Starting backend and frontend...
echo.
echo IMPORTANT: Two windows will open:
echo   1. Backend (Python/FastAPI) - Port 8000
echo   2. Frontend (Next.js) - Port 3000
echo.
echo The frontend will open automatically at http://localhost:3000
echo.

REM Start backend in a new window
start cmd /k "cd backend && python -m uvicorn app:app --reload"

REM Wait for backend to start
timeout /t 3 /nobreak

REM Start frontend in a new window
start cmd /k "cd frontend && npm run dev"

echo.
echo Setup complete! The application should open in your browser.
echo If it doesn't, visit: http://localhost:3000
echo.
pause
