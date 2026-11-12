@echo off
setlocal EnableExtensions
cd /d "%~dp0.."
title BACK2U D1 Backup - private Daten
echo.
echo ==========================================================
echo  BACK2U - SICHERES CLOUDFARE D1-BACKUP
echo  Nur Export, keine Daten werden geloescht oder geaendert.
echo ==========================================================
echo.
echo [1/4] Cloudflare Konto pruefen ...
call npx --yes wrangler@4 whoami
if errorlevel 1 (
  echo.
  echo Kein Cloudflare-Login. Erst: npx wrangler login
  goto :failure
)
echo.
echo [2/4] Richtige Datenbank pruefen ...
call npx --yes wrangler@4 d1 info back2u-cloud --config wrangler.cloudflare.jsonc
if errorlevel 1 goto :failure
echo.
echo WICHTIG: Kontrolliere Konto und Datenbanknamen im Ausgabebereich.
echo Die Backup-Datei kann OAuth-Tokens und private Statistiken enthalten.
set /p CONFIRM=Zum privaten EXPORT JA eingeben, sonst Abbruch: 
if /I not "%CONFIRM%"=="JA" (
  echo Export abgebrochen, keine Aenderung.
  goto :finish
)
if not exist private-backups mkdir private-backups
for /f %%T in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set "STAMP=%%T"
if not defined STAMP (
  echo Zeitstempel konnte nicht erstellt werden.
  goto :failure
)
set "TARGET=private-backups\BACK2U_D1_%STAMP%.sql"
if exist "%TARGET%" (
  echo Datei existiert bereits. Kein Ueberschreiben.
  goto :failure
)
echo.
echo [3/4] Exportiere D1 remote nach "%TARGET%" ...
call npx --yes wrangler@4 d1 export back2u-cloud --remote --config wrangler.cloudflare.jsonc --output "%TARGET%"
if errorlevel 1 goto :failure
if not exist "%TARGET%" (
  echo Fehler: Backup-Datei wurde nicht erstellt.
  goto :failure
)
for %%F in ("%TARGET%") do set "FILESIZE=%%~zF"
if %FILESIZE% LSS 1024 (
  echo Warnung: Backup wirkt sehr klein. Bitte Inhalt ohne Tokens zu posten lokal pruefen.
  goto :failure
)
echo.
echo [4/4] BACKUP erfolgreich erzeugt: %TARGET%
echo Dateigroesse: %FILESIZE% Bytes.
echo Bitte PRIVAT lagern. Die gesamte private-backups-Ordnerstruktur
echo ist per .gitignore vor versehentlichem Git-Commit ausgeschlossen.
goto :finish
:failure
echo.
echo Backup konnte NICHT bestaetigt werden. Keine weiteren Schritte starten.
:finish
echo.
pause
endlocal
