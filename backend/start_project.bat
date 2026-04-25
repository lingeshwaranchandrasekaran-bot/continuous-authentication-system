@echo off
cd /d C:\Users\linge\Desktop\monitor_system\backend

start cmd /k "python app.py"

timeout /t 5

start cmd /k "cd /d C:\Users\linge\Desktop\monitor_system\frontend && npm start"

timeout /t 10

python desktop_auth_app.py