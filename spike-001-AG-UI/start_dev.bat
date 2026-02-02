@echo off
echo ========================================
echo Starting AG-UI Research Spike Dev Envs
echo ========================================

REM Check if venv exists
if not exist "venv" (
    echo Virtual environment not found! Please run setup.bat first.
    pause
    exit /b
)

echo.
echo [1/2] Starting Backend Server (Port 8005)...
start "AG-UI Backend" cmd /k "call venv\Scripts\activate && cd backend && python -m uvicorn server:app --host 0.0.0.0 --port 8005 --reload"

echo.
echo [2/2] Starting Frontend Server (Port 5173)...
start "AG-UI Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo System is starting up!
echo Frontend will be available at: http://localhost:5173
echo.
echo If you see 'Address already in use' errors in the new windows,
echo please close any existing python/node processes or restart your PC.
echo ========================================
pause
