@echo off
title SoundScope — Explore the Sound Behind the Genre
echo ========================================================
echo   SoundScope: GTZAN Music Genre Visualization Platform
echo ========================================================
echo.
echo Starting R Data Server and Web Dashboard...
echo Dashboard will automatically open in your default browser.
echo.
"C:\Program Files\R\R-4.4.2\bin\Rscript.exe" R\server.R
pause
