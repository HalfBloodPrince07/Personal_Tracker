@echo off
echo ============================================
echo  Personal Life Intelligence System (with ngrok)
echo ============================================
echo.

:: Activate conda environment
call conda activate opensearch

:: Create data directory if it doesn't exist
if not exist "data" mkdir data

:: Install Python dependencies
echo [1/3] Installing Python dependencies...
pip install -r requirements.txt -q

:: Install frontend dependencies
echo [2/3] Installing frontend dependencies...
cd frontend
call npm install
cd ..

:: Start backend in background
echo [3/3] Starting servers...
echo.
echo Starting Backend on http://localhost:8000
start "PLIS Backend" cmd /k "conda activate opensearch && python -m uvicorn backend.api:app --host 0.0.0.0 --port 8000 --reload"

:: Give backend a moment to start
timeout /t 3 /nobreak >nul

:: Start frontend
echo Starting Frontend on http://localhost:5173
start "PLIS Frontend" cmd /k "cd frontend && npm run dev"

:: Give frontend a moment to start
timeout /t 5 /nobreak >nul

:: Start Ngrok Tunnel on frontend port (5173)
echo Starting Ngrok on port 5173...
start "Ngrok Tunnel" cmd /k "ngrok http --domain=unprefigured-brayden-unfarmed.ngrok-free.dev https://localhost:5173"

echo.
echo ============================================
echo  System is starting up!
echo.
echo  Check the new Ngrok window for your public URL
echo  (it will look like https://something.ngrok-free.app).
echo  Share that URL with your friends!
echo ============================================
