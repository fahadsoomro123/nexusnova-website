@echo off
setlocal
cd /d "%~dp0"
echo ==========================================
echo          NEXUSNOVA DEV AI v1
echo ==========================================
where python >nul 2>nul
if errorlevel 1 (
  echo Python nahi mila. Python 3 install hona chahiye.
  start "" "https://www.python.org/downloads/windows/"
  pause
  exit /b 1
)
where ollama >nul 2>nul
if errorlevel 1 (
  echo Ollama nahi mila. Pehle INSTALL_MODEL.bat run karo.
  pause
  exit /b 1
)
ollama list | findstr /i "gpt-oss:20b" >nul
if errorlevel 1 (
  echo gpt-oss:20b model nahi mila. INSTALL_MODEL.bat run karo.
  pause
  exit /b 1
)
python agent.py --workspace ".." --model "gpt-oss:20b"
pause
