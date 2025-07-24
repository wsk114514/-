@echo off
echo 启动智能问答系统前端服务...
echo.

REM 检查Node.js是否安装
node --version >nul 2>&1
if errorlevel 1 (
    echo 错误: 未找到Node.js，请先安装Node.js 16+
    pause
    exit /b 1
)

REM 检查依赖是否安装
if not exist "node_modules" (
    echo 安装前端依赖包...
    npm install
)

REM 启动开发服务器
echo.
echo 启动Vite开发服务器...
echo 服务地址: http://localhost:3000
echo 按 Ctrl+C 停止服务
echo.
npm run dev
