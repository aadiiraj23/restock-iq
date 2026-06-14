@echo off
echo Fixing Vite plugin-react compatibility...
echo.
echo Step 1: Removing broken cache...
if exist "node_modules\.vite" rmdir /s /q "node_modules\.vite"
echo Step 2: Installing compatible plugin version...
npm install @vitejs/plugin-react@4.3.4 --save-dev
echo.
echo Done! Now run: npm run dev
pause
