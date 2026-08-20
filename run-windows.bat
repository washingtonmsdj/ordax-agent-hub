@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul || (
  echo Node.js nao encontrado. Instale o Node.js LTS e tente novamente.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Instalando dependencias...
  call npm install || goto :error
)
call npm start
goto :eof
:error
echo.
echo Falha ao iniciar o OrdaX Agent Hub.
pause
exit /b 1
