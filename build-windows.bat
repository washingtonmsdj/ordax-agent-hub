@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul || (
  echo Node.js nao encontrado. Instale o Node.js LTS e tente novamente.
  pause
  exit /b 1
)
call npm install || goto :error
call npm run dist:win || goto :error
echo.
echo Build finalizado. Confira a pasta dist.
pause
goto :eof
:error
echo.
echo Falha no build.
pause
exit /b 1
