@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo Проверяю сборку проекта через Node.js/Vite...

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js не найден. Проверка сборки требует Node.js.
  pause
  exit /b 1
)

if not exist node_modules (
  set npm_config_registry=https://registry.npmjs.org/
  call npm install --no-package-lock
  if errorlevel 1 (
    echo Ошибка установки зависимостей.
    pause
    exit /b 1
  )
)

call npm run build
pause
