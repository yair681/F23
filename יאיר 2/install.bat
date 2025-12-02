@echo off
chcp 65001 >nul
cls

echo ╔════════════════════════════════════════════════════════════╗
echo ║                                                            ║
echo ║         פרחי אהרון - התקנת המערכת המעודכנת                ║
echo ║                                                            ║
echo ║         File Storage Edition v3.0                          ║
echo ║                                                            ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo.

echo [1/4] בדיקת Node.js...
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ✗ Node.js לא מותקן!
    echo.
    echo אנא התקן Node.js מ: https://nodejs.org/
    echo.
    pause
    exit /b 1
)
echo ✓ Node.js מותקן
node --version
echo.

echo [2/4] מעבר לתיקיית השרת...
cd server
if %ERRORLEVEL% NEQ 0 (
    echo ✗ תיקיית server לא נמצאה!
    pause
    exit /b 1
)
echo ✓ תיקיית server נמצאה
echo.

echo [3/4] התקנת חבילות...
echo (זה עשוי לקחת כמה רגעים...)
echo.
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ✗ התקנה נכשלה!
    echo.
    pause
    exit /b 1
)
echo.
echo ✓ כל החבילות הותקנו בהצלחה
echo.

echo [4/4] הפעלת השרת בפעם הראשונה...
echo.
echo השרת יפעל כעת וייצור את תיקיית הנתונים...
echo (לחץ Ctrl+C להפסקה לאחר האתחול)
echo.
timeout /t 3 /nobreak >nul

start "Pirhei Aharon Server" cmd /k "npm start"

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                                                            ║
echo ║                 ההתקנה הושלמה בהצלחה! ✓                  ║
echo ║                                                            ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo השרת פועל כעת בחלון נפרד!
echo.
echo 🌐 כתובת המערכת: http://localhost:10000
echo.
echo 👤 פרטי כניסה:
echo    אימייל: yairfrish2@gmail.com
echo    סיסמה: yair12345
echo.
echo 📁 מיקום הנתונים: server\data\
echo.
echo ════════════════════════════════════════════════════════════
echo.
echo סקריפטים שימושיים:
echo.
echo   • npm start       - הפעלת השרת
echo   • npm run check   - בדיקת מצב הנתונים  
echo   • backup.bat      - יצירת גיבוי
echo   • restore.bat     - שחזור מגיבוי
echo.
echo ════════════════════════════════════════════════════════════
echo.
echo 📚 תיעוד מלא זמין ב:
echo    - QUICK_START.md
echo    - FILE_STORAGE_MIGRATION.md
echo    - CHANGES_SUMMARY.md
echo.
echo ════════════════════════════════════════════════════════════
echo.
pause
