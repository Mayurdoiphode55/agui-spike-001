@echo off
REM AG-UI Research Spike - Setup Script for Windows

echo ========================================
echo AG-UI Research Spike Setup
echo ========================================
echo.

REM Check Python
python --version > nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Python not found. Please install Python 3.10+
    exit /b 1
)
echo ✓ Python found

REM Check Node
node --version > nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js not found. Please install Node.js 18+
    exit /b 1
)
echo ✓ Node.js found

REM Check Ollama
ollama --version > nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Ollama not found. Please install from https://ollama.com
    echo The project requires Ollama with llama3.1:8b model
)

echo.
echo Installing Python dependencies...

cd /d %~dp0

REM Create virtual environment
python -m venv venv
call venv\Scripts\activate

REM Install backend dependencies
pip install -r backend\requirements.txt

echo.
echo Installing frontend dependencies...
cd frontend
call npm install
cd ..

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo To start the project:
echo   1. Start Ollama: ollama serve
echo   2. Pull model: ollama pull llama3.1:8b
echo   3. Start backend: cd backend ^&^& python server.py
echo   4. Start frontend: cd frontend ^&^& npm run dev
echo   5. Open: http://localhost:5173
echo.
