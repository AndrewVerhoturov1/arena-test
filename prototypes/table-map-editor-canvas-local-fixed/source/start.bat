@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo  Redaktor stola i karty 0
echo ========================================
echo.
echo Zapusk bez npm install i bez Node.js.
echo.

if not exist "dist\index.html" (
  echo Ne naydena papka dist ili fayl dist\index.html.
  echo Raspakuyte arkhiv polnostyu, ne zapuskayte .bat pryamo vnutri zip-arkhiva.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0local-server.ps1"
if errorlevel 1 (
  echo.
  echo Ne udalos zapustit lokalny server cherez PowerShell.
  echo Poprobuyte fayl start-node.bat, esli ustanovlen Node.js.
  pause
  exit /b 1
)
pause
