@echo off
setlocal

set "ROOT=%~dp0.."
set "NODE_DIR=C:\Users\antonio.polo\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
set "NODE_EXE=%NODE_DIR%\node.exe"

if not exist "%NODE_EXE%" (
  echo Node runtime not found: %NODE_EXE%
  exit /b 1
)

set "PATH=%NODE_DIR%;%ROOT%\node_modules\.bin;%PATH%"
set "COMMAND=%~1"
shift /1
set "ARGS="

:collect_args
if "%~1"=="" goto dispatch
set "ARGS=%ARGS% "%~1""
shift /1
goto collect_args

:dispatch
if "%COMMAND%"=="" goto usage
if "%COMMAND%"=="sync-tiled" goto sync_tiled
if "%COMMAND%"=="typecheck" goto typecheck
if "%COMMAND%"=="test" goto test
if "%COMMAND%"=="build" (
  "%NODE_EXE%" "%ROOT%\scripts\sync-tiled-assets.mjs"
  if errorlevel 1 exit /b %ERRORLEVEL%
  "%NODE_EXE%" "%ROOT%\node_modules\typescript\bin\tsc" --noEmit
  if errorlevel 1 exit /b %ERRORLEVEL%
  "%NODE_EXE%" "%ROOT%\node_modules\vite\bin\vite.js" build %ARGS%
  exit /b %ERRORLEVEL%
)
if "%COMMAND%"=="dev" goto dev

:usage
echo Usage: scripts\game.cmd ^<sync-tiled^|typecheck^|test^|build^|dev^> [args...]
exit /b 1

:sync_tiled
"%NODE_EXE%" "%ROOT%\scripts\sync-tiled-assets.mjs" %ARGS%
exit /b %ERRORLEVEL%

:typecheck
"%NODE_EXE%" "%ROOT%\node_modules\typescript\bin\tsc" --noEmit %ARGS%
exit /b %ERRORLEVEL%

:test
"%NODE_EXE%" "%ROOT%\scripts\sync-tiled-assets.mjs"
if errorlevel 1 exit /b %ERRORLEVEL%
"%NODE_EXE%" "%ROOT%\node_modules\vitest\vitest.mjs" run %ARGS%
exit /b %ERRORLEVEL%

:dev
"%NODE_EXE%" "%ROOT%\scripts\sync-tiled-assets.mjs"
if errorlevel 1 exit /b %ERRORLEVEL%
"%NODE_EXE%" "%ROOT%\node_modules\vite\bin\vite.js" --host 127.0.0.1 %ARGS%
exit /b %ERRORLEVEL%
