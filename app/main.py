import os
import secrets
from pathlib import Path
from datetime import datetime
from fastapi import FastAPI, Request, Form, Depends, HTTPException, status
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from passlib.context import CryptContext
from pydantic import BaseModel
from fastapi.responses import JSONResponse
import uvicorn
from fastapi.staticfiles import StaticFiles
from llm import init_system, get_response
# 获取当前文件所在目录
BASE_DIR = Path(__file__).resolve().parent

app = FastAPI()

# 设置模板目录为绝对路径
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))

# 密码加密工具
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 会话管理 - 存储已登录用户的会话令牌
active_sessions = {}

# 模拟用户数据库
fake_users_db = {
    "admin": {
        "username": "admin",
        "hashed_password": pwd_context.hash("secret")
    }
}

@app.on_event("startup")
async def initialize_system():
    #初始化系统
    app.state.llm = init_system()

# 登录验证函数
def authenticate_user(username: str, password: str):
    if username not in fake_users_db:
        return False
    user = fake_users_db[username]
    return pwd_context.verify(password, user["hashed_password"])

# 创建会话令牌
def create_session(username: str) -> str:
    # 生成安全的随机令牌
    session_token = secrets.token_urlsafe(32)
    # 存储会话
    active_sessions[session_token] = username
    return session_token

# 验证会话令牌
def verify_session(session_token: str) -> bool:
    return session_token in active_sessions

# 路由定义
@app.get("/", response_class=HTMLResponse)
async def login_page(request: Request):
    """显示登录页面"""
    return templates.TemplateResponse("login.html", {"request": request})

@app.post("/login")
async def login_submit(
    request: Request,
    username: str = Form(...),
    password: str = Form(...)
):
    """处理登录请求"""
    if authenticate_user(username, password):
        # 登录成功 - 创建会话
        session_token = create_session(username)
        
        # 重定向到应用页面并设置cookie
        response = RedirectResponse(url="/app", status_code=status.HTTP_303_SEE_OTHER)
        response.set_cookie(key="session_token", value=session_token, httponly=True)
        return response
    else:
        # 登录失败 - 返回错误信息
        return templates.TemplateResponse(
            "login.html",
            {"request": request, "error": "用户名或密码错误"},
            status_code=401
        )

# 检查会话的依赖函数
async def get_current_user(request: Request):
    session_token = request.cookies.get("session_token")
    if not session_token or not verify_session(session_token):
        # 未登录或会话无效，重定向到登录页
        return RedirectResponse(url="/", status_code=status.HTTP_303_SEE_OTHER)
    return active_sessions[session_token]

# 修复后的应用页面路由
@app.get("/app", response_class=HTMLResponse)
async def app_page(request: Request, user: str = Depends(get_current_user)):
    """应用主界面（需要登录）"""
    # 如果user是重定向响应，直接返回它
    if isinstance(user, RedirectResponse):
        return user
    
    # 用户已登录，显示应用页面
    return templates.TemplateResponse(
        "页面主体.html", 
        {
            "request": request,  # 传递实际的请求对象
            "username": user,
            "now": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
    )

@app.get("/logout")
async def logout(request: Request):
    """注销登录"""
    session_token = request.cookies.get("session_token")
    if session_token in active_sessions:
        # 从活动会话中移除
        del active_sessions[session_token]
    
    # 清除cookie并重定向到登录页
    response = RedirectResponse(url="/")
    response.delete_cookie(key="session_token")
    return response
class ChatRequest(BaseModel):
    """聊天请求模型"""
    message: str

@app.post("/app")
async def chat(req:ChatRequest):
    """处理聊天请求"""
    message = req.message.strip()
    # 检查消息是否为空
    if not message:
        raise HTTPException(status_code=400, detail="消息不能为空")
    chain= app.state.llm  # 获取初始化的ConversationChain实例
    response = get_response(message, chain)
    
    return {"response": response}

app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app)
    