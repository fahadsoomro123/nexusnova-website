@echo off
setlocal
cd /d "%~dp0"

echo ===============================================
echo NexusNova Mobile AI Gateway
echo ===============================================
echo.
where python >nul 2>nul
if errorlevel 1 (
  echo Python not found. Install Python 3 and run again.
  pause
  exit /b 1
)

where ollama >nul 2>nul
if errorlevel 1 (
  echo Ollama not found. Run INSTALL_MODEL.bat first.
  pause
  exit /b 1
)

start "NexusNova Ollama" /min cmd /c "ollama serve"
timeout /t 2 /nobreak >nul

echo Starting local mobile gateway on port 8787...
echo Keep this window open while using NOVA AI from your phone.
echo.
python mobile_gateway.py --workspace ".." --host 127.0.0.1 --port 8787

echo.
echo Gateway stopped.
pause
