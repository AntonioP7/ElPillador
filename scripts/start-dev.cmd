@echo off
setlocal EnableDelayedExpansion

set "ROOT=%~dp0.."
set "PORT=5173"

if not "%~1"=="" set "PORT=%~1"

powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $socket = [Net.Sockets.TcpClient]::new('127.0.0.1', %PORT%); $socket.Close(); exit 0 } catch { exit 1 }"
if %ERRORLEVEL%==0 (
  echo Dev server already running at http://127.0.0.1:%PORT%
  exit /b 0
)

if not exist "%ROOT%\tmp" mkdir "%ROOT%\tmp"

set "OUT_LOG=%ROOT%\tmp\vite-dev.out.log"
set "ERR_LOG=%ROOT%\tmp\vite-dev.err.log"

break > "%OUT_LOG%"
break > "%ERR_LOG%"

start "el-pillador-dev" /min cmd /c "cd /d "%ROOT%" && scripts\game.cmd dev --port %PORT% --strictPort --clearScreen false 1>"%OUT_LOG%" 2>"%ERR_LOG%""

for /l %%i in (1,1,20) do (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $socket = [Net.Sockets.TcpClient]::new('127.0.0.1', %PORT%); $socket.Close(); exit 0 } catch { exit 1 }"
  if !ERRORLEVEL!==0 (
    echo Dev server running at http://127.0.0.1:%PORT%
    exit /b 0
  )
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 1"
)

echo Dev server did not start at http://127.0.0.1:%PORT%
echo --- stdout ---
type "%OUT_LOG%"
echo --- stderr ---
type "%ERR_LOG%"
exit /b 1
