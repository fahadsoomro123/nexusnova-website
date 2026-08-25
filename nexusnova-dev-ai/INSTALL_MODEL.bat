@echo off
setlocal
cd /d "%~dp0"
echo ==========================================
echo   NexusNova Dev AI - Local Model Setup
echo ==========================================
where ollama >nul 2>nul
if errorlevel 1 (
  echo.
  echo Ollama abhi install nahi hai.
  echo Browser me official Ollama download page khol raha hun.
  start "" "https://ollama.com/download/windows"
  echo.
  echo Ollama install kar ke isi INSTALL_MODEL.bat ko dobara run karna.
  pause
  exit /b 1
)

echo Ollama mil gaya.
echo OpenAI gpt-oss:20b download/check ho raha hai...
ollama pull gpt-oss:20b
if errorlevel 1 (
  echo.
  echo Model pull fail hua. Internet/Ollama check karo.
  pause
  exit /b 1
)
echo.
echo DONE. Ab START_NEXUSNOVA_AI.bat run karo.
pause
