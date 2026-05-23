@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo  Редактор стола и карты 0
echo ========================================
echo.
echo Запуск без npm install и без Node.js.
echo Используется готовая папка dist и локальный PowerShell-сервер.
echo.

if not exist "dist\index.html" (
  echo Не найдена папка dist или файл dist\index.html.
  echo Распакуйте архив полностью, не запускайте .bat прямо внутри zip-архива.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0local-server.ps1"
if errorlevel 1 (
  echo.
  echo Не удалось запустить локальный сервер через PowerShell.
  echo Попробуйте файл Запустить_через_Node.bat, если установлен Node.js.
  pause
  exit /b 1
)
pause
