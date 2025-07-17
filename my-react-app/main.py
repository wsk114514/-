# main.py

import os
import secrets
from pathlib import Path
from datetime import datetime
# 导入 FastAPI 相关模块
from fastapi import FastAPI, Request, Form, Depends, HTTPException, status,UploadFile,File
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
# 密码加密工具
from passlib.context import CryptContext
# 数据模型校验
from pydantic import BaseModel
from fastapi.responses import JSONResponse
import uvicorn
# 静态文件挂载
from fastapi.staticfiles import StaticFiles
# 添加CORS中间件 
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict
# 导入自定义 LLM 相关方法
from llm_chain import init_system, get_response, clear_memory
from document_processing import process_uploaded_file, split_documents, init_vector_store, clear_vector_store, generate_document_summary
import logging

# 获取当前文件所在目录
BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
# 在文件顶部添加
import os
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

# 创建 FastAPI 应用实例
app = FastAPI()

chain=init_system()

# 根据环境配置不同参数
if ENVIRONMENT == "production":
    # 生产环境配置
    app.mount(
        "/", 
        StaticFiles(directory=os.path.join(BASE_DIR, "../my-react-app/dist")),
        name="spa"
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  ## 将5173改为3000
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# 设置模板目录为绝对路径 - 修改前
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))

# 设置模板目录为绝对路径 - 修改后
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "../my-react-app/templates"))

# 初始化密码加密上下文
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 会话管理 - 存储已登录用户的会话令牌
active_sessions = {}

# 模拟用户数据库，仅包含一个 admin 用户
fake_users_db = {
    "admin": {
        "username": "admin",
        "hashed_password": pwd_context.hash("secret")
    }
}

# Add at the top of the file
from contextlib import asynccontextmanager

# Replace @app.on_event("startup") with:
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan event handler
    """
    # Initialize LLM on startup
    app.state.llm = init_system()
    yield  # Application runs here
    # Cleanup resources on shutdown
    # (Add any cleanup code if needed)

# Update app creation to use lifespan
app = FastAPI(lifespan=lifespan)

# 登录验证函数
def authenticate_user(username: str, password: str):
    """
    验证用户名和密码是否正确。
    """
    if username not in fake_users_db:
        return False
    user = fake_users_db[username]
    return pwd_context.verify(password, user["hashed_password"])

# 创建会话令牌
def create_session(username: str) -> str:
    """
    为登录用户生成安全的会话令牌，并存储。
    """
    session_token = secrets.token_urlsafe(32)
    active_sessions[session_token] = username
    return session_token

# 验证会话令牌
def verify_session(session_token: str) -> bool:
    """
    检查会话令牌是否有效。
    """
    return session_token in active_sessions

# 路由定义
# 删除登录页面路由
# @app.get("/", response_class=HTMLResponse)
# async def login_page(request: Request):
#     """
#     显示登录页面。
#     """
#     return templates.TemplateResponse("login.html", {"request": request})

# 修改聊天API路由
@app.post("/api/chat")  # 添加/api前缀避免与前端路由冲突
# 移动ChatRequest定义到路由之前
class ChatRequest(BaseModel):
    """
    Chat request model, contains message and function fields.
    """
    message: str
    function: str

@app.post("/app")
async def chat(req: ChatRequest):
    """
    处理聊天请求，调用 LLM 获取回复。
    """
    message = req.message.strip()
    function = req.function
    if not message:
        raise HTTPException(status_code=400, detail="消息不能为空")
    
    try:
        chain = app.state.llm  # 获取 ConversationChain 实例
        if not chain:
            raise HTTPException(status_code=500, detail="LLM服务初始化失败")
        
        response = get_response(message, chain, function)
        return {"response": response}
    except Exception as e:
        # 捕获所有异常并返回详细错误信息
        raise HTTPException(status_code=500, detail=f"服务器内部错误: {str(e)}")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# 添加清除记忆的路由
@app.post("/clear-memory")
async def clear_chat_memory():
    logger.info("收到清除记忆请求")
    try:
        chain = app.state.llm
        if not chain:
            raise HTTPException(status_code=500, detail="LLM服务初始化失败")
        
        # 调用llm_chain.py中的清除记忆函数
        from llm_chain import clear_memory
        clear_memory(chain)
        
        return {"message": "记忆已清除"}
    except Exception as e:
        logging.error(f"清除记忆失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"清除记忆失败: {str(e)}")


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """文件上传端点"""
    try:
        # 验证文件类型
        allowed_extensions = ['.txt', '.pdf', '.docx', '.doc']
        file_extension = os.path.splitext(file.filename)[1].lower()
        
        if file_extension not in allowed_extensions:
            return JSONResponse(
                status_code=400,
                content={"error": f"不支持的文件类型。请上传: {', '.join(allowed_extensions)} 文件"}
            )

        # 保存上传的文件
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
            logger.info(f"文件保存成功: {file_path}")
        
        # 处理文档
        try:
            # 清除现有向量存储
            clear_vector_store()
            logger.info("向量存储已清除")
            
            # 处理上传的文档
            documents = process_uploaded_file(file_path)
            split_docs = split_documents(documents)
            logger.info(f"文档分割完成: {len(split_docs)} 个块")
            #测试分块
            for doc in split_docs:
                print(doc)
                print('*'*100)
            # 初始化向量存储
            init_vector_store(split_docs)
            logger.info("向量存储初始化完成")
            
            # 获取文档摘要
            summary = generate_document_summary(split_docs)
            logger.info(f"文档摘要生成完成: {summary[:50]}...")
        except Exception as e:
            logger.error(f"文档处理失败: {str(e)}")
            # 删除上传的文件
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"已删除上传文件: {file_path}")
            return JSONResponse(
                status_code=500,
                content={"error": f"文档处理失败: {str(e)}"}
            )
        
        return {
            "message": "文件上传并处理成功",
            "filename": file.filename,
            "summary": summary,
            "page_count": len(documents),
            "chunk_count": len(split_docs)
        }
    except Exception as e:
        logger.error(f"文件上传失败: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"文件上传失败: {str(e)}"}
        )




# 删除注册页面路由
# @app.get("/register", response_class=HTMLResponse)
# async def register_page(request: Request):
#     """
#     显示注册页面。
#     """
#     return templates.TemplateResponse("register.html", {"request": request})
# 注册请求数据模型
class RegisterRequest(BaseModel):
    username: str
    password: str

@app.post("/register")
async def register_submit(data: RegisterRequest):
    """
    处理注册请求。
    """
    username = data.username
    password = data.password
    
    # 检查用户名和密码是否为空
    if not username or not password:
        return JSONResponse(
            status_code=400,
            content={"error": "用户名和密码不能为空"}
        )
    if username in fake_users_db:
        return JSONResponse(
            status_code=400,
            content={"error": "用户名已存在"}
        )
    # 创建新用户
    hashed_password = pwd_context.hash(password)
    fake_users_db[username] = {
        "username": username,
        "hashed_password": hashed_password
    }
    # 注册成功，返回JSON响应
    return JSONResponse(
        status_code=200,
        content={"message": "注册成功"}
    )
    # 注册成功，重定向到登录页
    response= RedirectResponse(url="/", status_code=status.HTTP_303_SEE_OTHER)
    return response

class LoginRequest(BaseModel):
    username: str
    password: str

@app.post("/login")
async def login_submit(data: LoginRequest):
    """
    处理登录请求。
    """
    username = data.username
    password = data.password
    
    if not username or not password:
        return JSONResponse(
            status_code=400,
            content={"error": "用户名和密码不能为空"}
        )
    
    if not authenticate_user(username, password):
        return JSONResponse(
            status_code=401,
            content={"error": "用户名或密码错误"}
        )
    
    session_token = create_session(username)
    response = JSONResponse(
        status_code=200,
        content={"message": "登录成功", "session_token": session_token}
    )
    response.set_cookie(key="session_token", value=session_token)
    return response
# 删除注册页面路由
# @app.get("/register", response_class=HTMLResponse)
# async def register_page(request: Request):
#     """
#     显示注册页面。
#     """
#     return templates.TemplateResponse("register.html", {"request": request})
# 注册请求数据模型
class RegisterRequest(BaseModel):
    username: str
    password: str

# 删除重复的RegisterRequest定义

@app.post("/register")
async def register_submit(data: RegisterRequest):
    """
    处理注册请求。
    """
    username = data.username
    password = data.password
    
    # 检查用户名和密码是否为空
    if not username or not password:
        return JSONResponse(
            status_code=400,
            content={"error": "用户名和密码不能为空"}
        )
    if username in fake_users_db:
        return JSONResponse(
            status_code=400,
            content={"error": "用户名已存在"}
        )
    # 创建新用户
    hashed_password = pwd_context.hash(password)
    fake_users_db[username] = {
        "username": username,
        "hashed_password": hashed_password
    }
    # 仅返回JSON响应，删除重定向代码
    return JSONResponse(
        status_code=200,
        content={"message": "注册成功"}
    )
    # 注册成功，重定向到登录页
    response= RedirectResponse(url="/", status_code=status.HTTP_303_SEE_OTHER)
    return response


# 挂载静态文件目录


# 静态文件挂载 - 修改为
app.mount(
    "/static", 
    StaticFiles(
        directory=os.path.join(BASE_DIR, "../my-react-app/static"),
        html=True  # 支持SPA路由
    ), 
    name="static"
)
#测试测试测试
# 作为主程序运行时，启动 uvicorn 服务
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app)