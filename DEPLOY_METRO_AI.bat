@echo off
setlocal
cd /d "%~dp0"
where firebase >nul 2>nul
if errorlevel 1 (
  echo Firebase CLI is not installed. Install it with: npm install -g firebase-tools
  pause
  exit /b 1
)
echo This deploys only the MetroChat Cloud Function. It does not change Realtime Database Rules.
firebase use metrochatmetroharta-i89op || goto :error
echo Enter your private OpenAI API key when prompted. It is stored as a Firebase Secret, not in index.html.
firebase functions:secrets:set OPENAI_API_KEY || goto :error
cd functions
call npm install || goto :error
cd ..
firebase deploy --only functions || goto :error
echo Metro AI backend deployment finished.
pause
exit /b 0
:error
echo Deployment stopped. No Realtime Database data was modified.
pause
exit /b 1
