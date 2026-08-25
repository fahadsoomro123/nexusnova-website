@echo off
setlocal
echo ===============================================
echo       NOVA AI POWER V6 - PC CHECK
echo ===============================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ram=(Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory/1GB; $cpu=(Get-CimInstance Win32_Processor | Select-Object -First 1 -ExpandProperty Name); $gpu=(Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Name) -join ', '; $free=(Get-PSDrive -Name C).Free/1GB; Write-Host ('RAM: {0:N1} GB' -f $ram); Write-Host ('CPU: '+$cpu); Write-Host ('GPU: '+$gpu); Write-Host ('C drive free: {0:N1} GB' -f $free); Write-Host ''; if($ram -ge 24){Write-Host 'NOVA V6: GOOD RAM for gpt-oss:20b.'} elseif($ram -ge 16){Write-Host 'NOVA V6: MINIMUM/USABLE RAM range; speed depends on GPU/CPU and other apps.'} else {Write-Host 'NOVA V6: RAM below the recommended 16 GB class for gpt-oss:20b; use a smaller model or upgrade RAM.'}; if($free -lt 25){Write-Host 'Storage warning: keep about 25 GB free for model/cache/headroom.'} else {Write-Host 'Storage: enough headroom.'}"
echo.
pause
