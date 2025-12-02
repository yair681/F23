@echo off
setlocal EnableDelayedExpansion

REM Backup script for Pirhei Aharon School Management System
REM Creates a timestamped backup of the data directory

echo ======================================
echo   Pirhei Aharon - Backup Script
echo ======================================
echo.

REM Get current date and time
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TIMESTAMP=%datetime:~0,8%_%datetime:~8,6%

REM Set backup directory
set BACKUP_DIR=backups\backup_%TIMESTAMP%
set DATA_DIR=data

echo Creating backup: %BACKUP_DIR%
echo.

REM Create backups directory if it doesn't exist
if not exist "backups" (
    mkdir "backups"
    echo Created backups directory
)

REM Create timestamped backup directory
mkdir "%BACKUP_DIR%"

REM Copy data directory
echo Copying data files...
xcopy "%DATA_DIR%" "%BACKUP_DIR%\data" /E /I /H /Y > nul

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✓ Backup completed successfully!
    echo.
    echo Backup location: %CD%\%BACKUP_DIR%
    echo.
    
    REM List backup contents
    echo Backed up files:
    dir /B "%BACKUP_DIR%\data"
    
    echo.
    echo ======================================
) else (
    echo.
    echo ✗ Backup failed!
    echo Error code: %ERRORLEVEL%
    echo.
)

echo.
pause
