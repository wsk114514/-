# main.py - 重构优化版本

import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, UploadFile, File
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
import json

# 导入配置和模块
from config import BASE_DIR, ENVIRONMENT, CORS_ORIGINS
from models import (
    ChatRequest, LoginRequest, RegisterRequest, 
    ChatResponse, UploadResponse, ErrorResponse, SuccessResponse
)
from auth import auth_manager
from llm_chain import init_system, get_response, get_response_stream, clear_memory
from document_processing import (
    process_uploaded_file, split_documents, 
    init_vector_store, clear_vector_store, generate_document_summary
)
from config import UPLOAD_DIR, ALLOWED_EXTENSIONS

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ApplicationState:
    """应用状态管理类"""
    
    def __init__(self):
        self.llm_systems = {}  # 按功能类型存储系统
        self.valid_functions = ["general", "play", "game_guide", "doc_qa", "game_wiki"]
    
    def initialize(self):
        """初始化应用状态"""
        try:
            # 初始化默认的通用系统
            self.llm_systems["general"] = init_system("general")
            logger.info("LLM系统初始化成功")
        except Exception as e:
            logger.error(f"LLM系统初始化失败: {str(e)}")
            raise
    
    def get_system_for_function(self, function_type: str):
        """获取指定功能的系统，如果不存在则创建"""
        if function_type not in self.valid_functions:
            function_type = "general"
        
        if function_type not in self.llm_systems:
            try:
                self.llm_systems[function_type] = init_system(function_type)
                logger.info(f"为功能 {function_type} 创建了新的LLM系统")
            except Exception as e:
                logger.error(f"为功能 {function_type} 创建系统失败: {str(e)}")
                # 使用通用系统作为后备
                if "general" in self.llm_systems:
                    return self.llm_systems["general"]
                raise
        
        return self.llm_systems[function_type]


# 全局应用状态
app_state = ApplicationState()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时初始化
    logger.info("正在启动应用...")
    app_state.initialize()
    
    yield
    
    # 关闭时清理
    logger.info("正在关闭应用...")


# 初始化FastAPI应用
app = FastAPI(
    title="智能对话系统",
    description="基于大模型的多功能对话系统",
    version="1.0.0",
    lifespan=lifespan
)


# 配置CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 静态文件服务
app.mount("/static", StaticFiles(directory="static"), name="static")


def get_app_state() -> ApplicationState:
    """依赖注入：获取应用状态"""
    return app_state


def get_llm_system(function_type: str = "general"):
    """依赖注入：获取指定功能的LLM系统"""
    return app_state.get_system_for_function(function_type)


# === 对话相关端点 ===

@app.post("/app", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest):
    """处理聊天请求"""
    try:
        message = req.message.strip()
        if not message:
            return JSONResponse(
                status_code=400,
                content={"error": "消息不能为空"}
            )
        
        # 获取功能特定的系统
        system = get_llm_system(req.function)
        response = get_response(message, system, req.function)
        return ChatResponse(response=response)
        
    except Exception as e:
        logger.error(f"聊天处理失败: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"服务器内部错误: {str(e)}"}
        )


@app.post("/app/stream")
async def chat_stream_endpoint(req: ChatRequest):
    """流式响应对话端点"""
    try:
        message = req.message.strip()
        if not message:
            return JSONResponse(
                status_code=400,
                content={"error": "消息不能为空"}
            )
        
        # 获取功能特定的系统
        system = get_llm_system(req.function)
        
        async def generate():
            """生成流式响应"""
            try:
                async for chunk in get_response_stream(message, system, req.function):
                    yield f"data: {json.dumps({'content': chunk}, ensure_ascii=False)}\n\n"
                yield f"data: [DONE]\n\n"
            except Exception as e:
                logger.error(f"流式响应生成失败: {str(e)}")
                yield f"data: {json.dumps({'error': str(e)}, ensure_ascii=False)}\n\n"
        
        return StreamingResponse(
            generate(),
            media_type="text/plain",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Content-Type": "text/plain; charset=utf-8"
            }
        )
        
    except Exception as e:
        logger.error(f"流式对话失败: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"对话失败: {str(e)}"}
        )


# === 记忆管理端点 ===

@app.post("/memory/clear", response_model=SuccessResponse)
async def clear_memory_endpoint(function_type: str = "current"):
    """清除记忆端点"""
    try:
        if function_type == "all":
            # 清除所有功能的记忆
            from llm_chain import clear_all_memories
            clear_all_memories()
            logger.info("所有记忆已清除")
            return SuccessResponse(message="所有记忆已清除")
        elif function_type == "current":
            # 向后兼容：清除默认系统记忆
            system = get_llm_system("general")
            clear_memory(system)
            logger.info("当前记忆已清除")
            return SuccessResponse(message="当前记忆已清除")
        else:
            # 清除指定功能的记忆
            from llm_chain import clear_memory_for_function
            clear_memory_for_function(function_type)
            logger.info(f"功能 {function_type} 的记忆已清除")
            return SuccessResponse(message=f"功能 {function_type} 的记忆已清除")
    except Exception as e:
        logger.error(f"清除记忆失败: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"清除记忆失败: {str(e)}"}
        )

@app.post("/memory/clear/{function_type}", response_model=SuccessResponse)
async def clear_function_memory_endpoint(function_type: str):
    """清除指定功能记忆端点"""
    try:
        if function_type == "all":
            from llm_chain import clear_all_memories
            clear_all_memories()
            logger.info("所有记忆已清除")
            return SuccessResponse(message="所有记忆已清除")
        else:
            from llm_chain import clear_memory_for_function
            clear_memory_for_function(function_type)
            logger.info(f"功能 {function_type} 的记忆已清除")
            return SuccessResponse(message=f"功能 {function_type} 的记忆已清除")
    except Exception as e:
        logger.error(f"清除记忆失败: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"清除记忆失败: {str(e)}"}
        )

# === 文档处理端点 ===

@app.post("/upload", response_model=UploadResponse)
async def upload_document(file: UploadFile = File(...)):
    """文档上传端点"""
    try:
        # 验证文件类型
        file_extension = os.path.splitext(file.filename)[1].lower()
        if file_extension not in ALLOWED_EXTENSIONS:
            return JSONResponse(
                status_code=400,
                content={"error": f"不支持的文件类型。支持的类型: {', '.join(ALLOWED_EXTENSIONS)}"}
            )
        
        # 保存文件
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
            
            # 初始化向量存储
            init_vector_store(split_docs)
            logger.info("向量存储初始化完成")
            
            # 获取文档摘要
            summary = generate_document_summary(split_docs)
            logger.info(f"文档摘要生成完成")
            
            return UploadResponse(
                message="文件上传并处理成功",
                filename=file.filename,
                summary=summary,
                page_count=len(documents),
                chunk_count=len(split_docs)
            )
            
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
        
    except Exception as e:
        logger.error(f"文件上传失败: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"文件上传失败: {str(e)}"}
        )


@app.post("/documents/clear", response_model=SuccessResponse)
async def clear_documents():
    """清除所有文档端点"""
    try:
        clear_vector_store()
        logger.info("所有文档已清除")
        return SuccessResponse(message="所有文档已清除")
    except Exception as e:
        logger.error(f"清除文档失败: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"清除文档失败: {str(e)}"}
        )


# === 认证相关端点 ===

@app.post("/login", response_model=SuccessResponse)
async def login_endpoint(req: LoginRequest):
    """用户登录端点"""
    try:
        if auth_manager.authenticate_user(req.username, req.password):
            session_token = auth_manager.create_session(req.username)
            logger.info(f"用户 {req.username} 登录成功")
            
            response = JSONResponse(
                status_code=200,
                content={"message": "登录成功", "session_token": session_token}
            )
            response.set_cookie(key="session_token", value=session_token)
            return response
        else:
            logger.warning(f"用户 {req.username} 登录失败：用户名或密码错误")
            return JSONResponse(
                status_code=401,
                content={"error": "用户名或密码错误"}
            )
    except Exception as e:
        logger.error(f"登录处理失败: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"登录失败: {str(e)}"}
        )


@app.post("/register", response_model=SuccessResponse)
async def register_endpoint(req: RegisterRequest):
    """用户注册端点"""
    try:
        if auth_manager.register_user(req.username, req.password):
            logger.info(f"用户 {req.username} 注册成功")
            return SuccessResponse(message="注册成功")
        else:
            logger.warning(f"用户 {req.username} 注册失败：用户名已存在")
            return JSONResponse(
                status_code=400,
                content={"error": "用户名已存在"}
            )
    except Exception as e:
        logger.error(f"注册处理失败: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"注册失败: {str(e)}"}
        )


# === 健康检查端点 ===

@app.get("/health")
async def health_check():
    """健康检查端点"""
    return {
        "status": "healthy",
        "environment": ENVIRONMENT,
        "llm_initialized": app_state.llm_system is not None
    }


# === 根路径处理 ===

@app.get("/")
async def root():
    """根路径"""
    return {"message": "智能对话系统 API 服务正在运行"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )