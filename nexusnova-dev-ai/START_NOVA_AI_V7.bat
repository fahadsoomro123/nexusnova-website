@echo off
setlocal
cd /d "%~dp0"

echo ===============================================
echo        NEXUSNOVA NOVA AI V7 PRO MAX
echo ===============================================
echo.
where python >nul 2>nul
if errorlevel 1 (
  echo Python 3 not found. Install Python 3 and enable Add Python to PATH.
  pause
  exit /b 1
)
where ollama >nul 2>nul
if errorlevel 1 (
  echo Ollama not found. Install Ollama first.
  pause
  exit /b 1
)

echo Checking gpt-oss:20b...
ollama list | findstr /i "gpt-oss:20b" >nul
if errorlevel 1 (
  echo Model not found. Complete gpt-oss:20b installation first.
  pause
  exit /b 1
)

start "NexusNova Ollama" /min cmd /c "ollama serve"
timeout /t 2 /nobreak >nul

echo.
echo Starting NOVA AI V7 PRO MAX gateway...
echo Deep Research: ON
echo Smart Knowledge Search: ON
echo CSV/JSON Data Analysis: ON
echo Persistent Workspaces: ON
echo Local background Work jobs: ON while this PC stays running
echo Keep this window open while using NOVA AI from your phone.
echo GitHub writes stay OFF until explicitly armed.
echo.
python mobile_gateway_v7.py --workspace ".." --host 127.0.0.1 --port 8787

echo.
echo NOVA AI V7 PRO MAX stopped.
pause
