@echo off
setlocal
cd /d "%~dp0"
where firebase >nul 2>nul
if errorlevel 1 (
  echo Firebase CLI is not installed. Install it with: npm install -g firebase-tools
  pause
  exit /b 1
)
echo WARNING: this publishes Realtime Database Rules to the selected Firebase project.
echo First make a backup of your current Rules in Firebase Console.
pause
firebase use metrochatmetroharta-i89op || goto :error
firebase deploy --only database || goto :error
echo Database Rules deployment command finished.
pause
exit /b 0
:error
echo Deployment failed. Check Firebase CLI output.
pause
exit /b 1
