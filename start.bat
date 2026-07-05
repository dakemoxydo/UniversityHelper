@echo off
setlocal

cd /d "%~dp0"

echo ========================================
echo University Helper local launcher
echo ========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed or is not available in PATH.
  echo Install Node.js from https://nodejs.org/ and run this file again.
  echo.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm is not installed or is not available in PATH.
  echo Reinstall Node.js with npm enabled and run this file again.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Installing dependencies. This is only needed on the first launch.
  call npm install --legacy-peer-deps
  if errorlevel 1 (
    echo.
    echo Dependency installation failed.
    pause
    exit /b 1
  )
  echo.
)

if not exist ".env.local" if exist ".env.example" (
  copy ".env.example" ".env.local" >nul
  echo Created .env.local from .env.example.
  echo You can edit DATABASE_URL later if you want PostgreSQL persistence.
  echo.
)

echo Opening http://localhost:3000 ...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 4; Start-Process 'http://localhost:3000'" >nul 2>nul

echo Starting Next.js development server.
echo Keep this window open while you use the app.
echo Press Ctrl+C to stop the server.
echo.
call npm run dev

echo.
echo Server stopped.
pause
