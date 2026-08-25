@echo off
setlocal
cd /d "%~dp0"

echo ===============================================
echo      NEXUSNOVA NOVA AI POWER V6
echo ===============================================
echo.
where python >nul 2>nul
if errorlevel 1 (
  echo Python 3 not found. Install Python 3 first.
  pause
  exit /b 1
)
where ollama >nul 2>nul
if errorlevel 1 (
  echo Ollama not found. Run INSTALL_MODEL.bat first.
  pause
  exit /b 1
)

echo Checking gpt-oss:20b...
ollama list | findstr /i "gpt-oss:20b" >nul
if errorlevel 1 (
  echo Model not found. Run INSTALL_MODEL.bat first.
  pause
  exit /b 1
)

start "NexusNova Ollama" /min cmd /c "ollama serve"
timeout /t 2 /nobreak >nul

echo.
echo Starting NOVA AI POWER V6 gateway...
echo Keep this window open while using NOVA AI from your phone.
echo GitHub writes stay OFF until explicitly armed.
echo.
python mobile_gateway_v6.py --workspace ".." --host 127.0.0.1 --port 8787

echo.
echo NOVA AI POWER V6 stopped.
pause
