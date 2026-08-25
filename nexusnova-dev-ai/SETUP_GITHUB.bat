@echo off
setlocal
cd /d "%~dp0"
echo ==========================================
echo      NexusNova GitHub Helper Setup
echo ==========================================
where git >nul 2>nul
if errorlevel 1 (
  echo Git nahi mila. Git for Windows install karo.
  start "" "https://git-scm.com/download/win"
  pause
  exit /b 1
)
where gh >nul 2>nul
if errorlevel 1 (
  echo GitHub CLI nahi mila. Official download page khol raha hun.
  start "" "https://cli.github.com/"
  pause
  exit /b 1
)
echo GitHub login status:
gh auth status
if errorlevel 1 (
  echo.
  echo Ab GitHub login start ho raha hai. Browser instructions follow karo.
  gh auth login
)
echo.
echo Setup complete. Local AI me PR bhejne se pehle /github-on type karna.
pause
