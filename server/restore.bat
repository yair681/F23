@echo off
setlocal EnableDelayedExpansion

REM Restore script for Pirhei Aharon School Management System
REM Restores data from a backup directory

echo ======================================
echo   Pirhei Aharon - Restore Script
echo ======================================
echo.

REM Check if backups directory exists
if not exist "backups" (
    echo ✗ No backups directory found!
    echo.
    pause
    exit /b 1
)

REM List available backups
echo Available backups:
echo.
set count=0
for /d %%D in (backups\backup_*) do (
    set /a count+=1
    echo [!count!] %%~nxD
    set "backup[!count!]=%%D"
)

if %count% EQU 0 (
    echo ✗ No backups found!
    echo.
    pause
    exit /b 1
)

echo.
set /p choice="Enter backup number to restore (1-%count%): "

REM Validate input
if !choice! LSS 1 (
    echo ✗ Invalid choice!
    pause
    exit /b 1
)
if !choice! GTR %count% (
    echo ✗ Invalid choice!
    pause
    exit /b 1
)

REM Get selected backup
set BACKUP_DIR=!backup[%choice%]!
echo.
echo Selected backup: %BACKUP_DIR%
echo.

REM Warning
echo ⚠️  WARNING: This will overwrite all current data!
echo.
set /p confirm="Are you sure? (yes/no): "

if /i not "%confirm%" == "yes" (
    echo.
    echo Restore cancelled.
    echo.
    pause
    exit /b 0
)

echo.
echo Restoring data...

REM Backup current data first
set TIMESTAMP=%date:~-4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set SAFETY_BACKUP=backups\before_restore_%TIMESTAMP%

echo Creating safety backup of current data...
mkdir "%SAFETY_BACKUP%"
xcopy "data" "%SAFETY_BACKUP%\data" /E /I /H /Y > nul

REM Restore from selected backup
echo Restoring from backup...
xcopy "%BACKUP_DIR%\data" "data" /E /I /H /Y > nul

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✓ Restore completed successfully!
    echo.
    echo Your old data was saved to: %SAFETY_BACKUP%
    echo.
    echo ======================================
) else (
    echo.
    echo ✗ Restore failed!
    echo Error code: %ERRORLEVEL%
    echo.
)

echo.
pause
