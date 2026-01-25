@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================
echo   SkillBuilder Setup
echo ========================================
echo.

if not exist "backend\.env" (
    echo Error: backend\.env not found!
    pause
    exit /b 1
)

REM Check if API key exists and is not empty
for /f "tokens=*" %%A in ('type backend\.env') do (
    if "%%A" neq "GROQ_API_KEY=" (
        echo API key already configured
        goto start_system
    )
)

echo Get your Groq API key from: https://console.groq.com/keys
echo.

:prompt_key
set /p USER_KEY="Paste your Groq API key: "

if "!USER_KEY!"=="" (
    echo API key cannot be empty!
    goto prompt_key
)

echo.
echo Saving API key...
(
    echo GROQ_API_KEY=!USER_KEY!
) > backend\.env

echo API key saved!
echo.

:start_system
echo.
echo ========================================
echo   Starting SkillBuilder
echo ========================================
echo.

if not exist "frontend\node_modules" (
    echo Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
)

echo Installing backend dependencies...
cd backend
call pip install -r requirements.txt -q
cd ..

echo.
echo All dependencies installed!
echo.
echo Starting backend and frontend...
echo Two windows will open:
echo   - Backend (port 8000)
echo   - Frontend (port 3000)
echo.

start cmd /k "cd backend && python -m uvicorn app:app --reload"
timeout /t 3 /nobreak
start cmd /k "cd frontend && npm run dev"

echo.
echo Setup complete! Visit http://localhost:3000
echo.
pause
