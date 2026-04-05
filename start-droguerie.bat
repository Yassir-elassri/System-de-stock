@echo off
echo Starting Droguerie Management System...
echo.

REM Change to the project directory
cd /d "C:\Users\lenovo\Desktop\Platform StockD\Platform StockD"

REM Start the development server in the background with lightning mode
start /min cmd /c "npm run dev:lightning"

REM Wait a moment for the server to start
timeout /t 5 /nobreak >nul

REM Open the browser
start http://localhost:3000

echo.
echo Droguerie Management System is starting...
echo Browser should open automatically in a few seconds.
echo.
echo Press any key to close this window...
pause >nul
