@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo  Редактор стола и карты 0 / режим разработки
echo ========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js не найден.
  echo Для этого режима установите Node.js LTS с официального сайта nodejs.org.
  echo Или используйте обычный файл Запустить.bat, он работает без Node.js.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm не найден. Обычно он устанавливается вместе с Node.js.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Устанавливаю зависимости из публичного npm registry. Это нужно сделать один раз.
  set npm_config_registry=https://registry.npmjs.org/
  call npm install --no-package-lock
  if errorlevel 1 (
    echo.
    echo Ошибка установки зависимостей.
    pause
    exit /b 1
  )
)

echo.
echo Запускаю Vite dev-server...
echo Если браузер не открылся автоматически, откройте адрес, который появится ниже.
echo.
start "" http://127.0.0.1:5173/
call npm run dev
pause
