@echo off
title Task Manager

echo ========================================
echo        TASK MANAGER STARTING
echo ========================================
echo.

cd /d D:\TaskManager

echo [1/2] Starting Backend...
start "TaskManager Backend" cmd /k "cd /d D:\TaskManager\backend && .venv\Scripts\activate && uvicorn app.main:app --reload"

timeout /t 2 /nobreak >nul

echo [2/2] Starting Frontend...
start "TaskManager Frontend" cmd /k "cd /d D:\TaskManager\frontend && npm run dev"

echo.
echo ========================================
echo        TASK MANAGER STARTED
echo ========================================
echo.
echo Backend:  http://127.0.0.1:8000
echo Swagger:  http://127.0.0.1:8000/docs
echo Frontend: http://localhost:5173
echo.
pause