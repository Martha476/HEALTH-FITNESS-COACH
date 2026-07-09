@echo off
REM Health Fitness Coach - Quick Start Script for Windows
REM This script sets up and runs the entire project

setlocal enabledelayedexpansion

echo.
echo 7F4F Health Fitness Coach - Quick Setup
echo ======================================
echo.

REM Check Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Python is not installed
    exit /b 1
)

echo [OK] Python found
python --version

REM Check Node
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed
    exit /b 1
)

echo [OK] Node.js found
call node --version

echo.
echo Setting up backend...
cd backend

REM Create virtual environment
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing Python dependencies...
pip install -q -r requirements.txt

REM Create .env if not exists
if not exist ".env" (
    echo Creating .env file...
    copy .env.example .env
    echo [WARNING] Please update .env with your API keys
)

cd ..

echo [OK] Backend setup complete

echo.
echo Setting up frontend...
cd frontend

REM Install dependencies
if not exist "node_modules" (
    echo Installing Node dependencies...
    call npm install -q
)

REM Create .env.local if not exists
if not exist ".env.local" (
    echo Creating .env.local file...
    (
        echo NEXT_PUBLIC_API_URL=http://localhost:8000
        echo PYTHON_API_URL=http://localhost:8000
    ) > .env.local
)

cd ..

echo [OK] Frontend setup complete

echo.
echo.
echo Ready to start!
echo ================
echo.
echo To run the application:
echo.
echo Terminal 1 (Backend):
echo   cd backend
echo   venv\Scripts\activate
echo   python -m uvicorn api.main:app --reload
echo.
echo Terminal 2 (Frontend):
echo   cd frontend
echo   npm run dev
echo.
echo Then visit: http://localhost:3000
echo.
echo Important: Add your OpenAI API key to backend\.env
echo.

pause
