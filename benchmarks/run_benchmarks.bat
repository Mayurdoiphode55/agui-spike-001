@echo off
REM AG-UI Benchmark Runner Script

echo ========================================
echo AG-UI Benchmark Suite
echo ========================================
echo.

REM Check if backend is running
echo Checking backend connectivity...
curl -s http://localhost:8000/health > nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Backend not running on port 8000
    echo Please start the backend first: cd backend && python server.py
    exit /b 1
)

echo Backend is running!
echo.

REM Run benchmarks
echo Running benchmarks for all frameworks...
cd /d %~dp0
python benchmark.py --backend http://localhost:8000 --frameworks langchain crewai

echo.
echo ========================================
echo Benchmarks complete!
echo Results saved to: logs/performance.json
echo ========================================
