@echo off
cd /d "%~dp0"
echo === ApnaDukan launcher ===
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)
call venv\Scripts\activate
echo Installing Python packages (first time takes 1-2 minutes)...
pip install -q -r backend\requirements.txt
if not exist backend\.env (
    echo.
    echo No .env file found. Creating one from the template.
    copy backend\.env.example backend\.env >nul
    echo Notepad will open. Fill in your keys, save, and close it.
    notepad backend\.env
)
echo Building frontend (first time takes a couple of minutes)...
pushd frontend
if not exist node_modules call npm install
call npm run build
popd
cd backend
echo.
echo Starting server - open http://localhost:5000 in Chrome
python app.py
pause
