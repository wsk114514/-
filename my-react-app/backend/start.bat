@echo off
echo 启动智能问答系统后端服务...
echo.

REM 检查Python是否安装
python --version >nul 2>&1
if errorlevel 1 (
    echo 错误: 未找到Python，请先安装Python 3.8+
    pause
    exit /b 1
)

REM 检查虚拟环境
if not exist "venv" (
    echo 创建虚拟环境...
    python -m venv venv
)

REM 激活虚拟环境
echo 激活虚拟环境...
call venv\Scripts\activate.bat

REM 安装依赖
echo 安装Python依赖包...
pip install -r requirements.txt

REM 启动服务
echo.
echo 启动FastAPI服务器...
echo 服务地址: http://localhost:8000
echo 按 Ctrl+C 停止服务
echo.
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
