#!/usr/bin/env bash
# ApnaDukan launcher for macOS / Linux
set -e
cd "$(dirname "$0")"
[ -d venv ] || python3 -m venv venv
source venv/bin/activate
pip install -q -r backend/requirements.txt
if [ ! -f backend/.env ]; then cp backend/.env.example backend/.env; echo "Created backend/.env — add your keys, then re-run."; exit 0; fi
( cd frontend && [ -d node_modules ] || npm install; npm run build )
cd backend && python app.py
