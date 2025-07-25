# main.py - 智能游戏对话系统后端主入口
"""
智能游戏对话系统 - FastAPI后端服务

这是一个基于FastAPI的智能对话系统后端，集成了以下核心功能：
1. 🤖 AI对话服务 - 基于DeepSeek大模型的多功能聊天
2. 📄 文档处理服务 - RAG技术支持的文档问答
3. 🔐 用户认证系统 - 登录注册和会话管理
4. 📁 文件上传服务 - 支持PDF/TXT文档上传分析
5. 🔄 流式响应 - 实时消息流式传输

技术栈:
- Web框架: FastAPI (现代化的Python Web框架)
- AI集成: LangChain + DeepSeek (大语言模型集成)
- 文档处理: PyPDF2 + python-docx (多格式文档解析)
- 向量数据库: ChromaDB (语义检索和RAG)
- 认证系统: 自定义JWT实现
"""

import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, UploadFile, File, Header
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
    init_vector_store, clear_vector_store, clear_all_document_data, clear_user_document_data, generate_document_summary
)
from config import UPLOAD_DIR, ALLOWED_EXTENSIONS
from pathlib import Path

# 配置日志系统 - 统一的日志格式和级别
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),  # 控制台输出
        # 可以添加文件输出: logging.FileHandler('app.log')
    ]
)
logger = logging.getLogger(__name__)


# ========================= 认证相关函数 =========================

def get_current_user_simple(x_user_id: str = Header(default="default", alias="X-User-ID")):
    """
    简单的用户信息获取函数
    从请求头获取用户ID
    """
    return {"user_id": x_user_id}


class ApplicationState:
    """
    应用状态管理类
    
    负责管理整个应用的全局状态，包括：
    - LangChain系统初始化和缓存
    - 不同功能模式的系统实例管理
    - 应用生命周期中的资源管理
    
    设计模式: 单例模式，确保全局唯一的状态管理器
    """
    
    def __init__(self):
        """初始化应用状态管理器"""
        self.systems = {}  # 存储不同功能类型的LangChain系统实例
        self.is_initialized = False  # 标记是否已初始化
        logger.info("应用状态管理器已创建")
    
    def initialize(self):
        """
        初始化应用核心系统
        
        在应用启动时调用，负责：
        1. 初始化各种功能模式的LangChain系统
        2. 预热AI模型连接
        3. 设置默认配置
        """
        if self.is_initialized:
            logger.warning("应用已经初始化，跳过重复初始化")
            return
            
        try:
            logger.info("开始初始化应用核心系统...")
            
            # 初始化基础LangChain系统
            # 这里会预加载不同功能模式的Prompt模板和配置
            init_system()
            
            self.is_initialized = True
            logger.info("✅ 应用核心系统初始化完成")
            
        except Exception as e:
            logger.error(f"❌ 应用初始化失败: {str(e)}")
            raise
    
    def get_system_for_function(self, function_type: str):
        """
        获取指定功能类型的LangChain系统实例
        
        Args:
            function_type (str): 功能类型
                - "general": 通用助手
                - "game_guide": 游戏攻略
                - "game_recommend": 游戏推荐  
                - "doc_qa": 文档问答
                - "game_wiki": 游戏百科
        
        Returns:
            LangChain系统实例，用于处理特定类型的对话
        """
        if function_type not in self.systems:
            logger.info(f"创建新的{function_type}功能系统实例")
            # 这里可以根据不同功能类型返回不同配置的系统
            # 目前使用统一的系统，未来可以扩展为专门的系统
            self.systems[function_type] = init_system()
        
        return self.systems[function_type]
    """
    应用状态管理类
    
    负责管理整个应用的全局状态，包括：
    - LLM系统实例管理
    - 功能类型验证
    - 系统初始化和清理
    """
    
    def __init__(self):
        """初始化应用状态管理器"""
        # 按功能类型存储不同的LLM系统实例
        self.llm_systems = {}
        
        # 定义支持的功能类型
        self.valid_functions = [
            "general",      # 通用助手
            "play",         # 游戏推荐
            "game_guide",   # 游戏攻略
            "doc_qa",       # 文档问答
            "game_wiki"     # 游戏百科
        ]
    
    def initialize(self):
        """
        初始化应用状态
        
        在应用启动时调用，负责：
        - 初始化默认LLM系统
        - 验证系统依赖
        - 记录初始化状态
        """
        try:
            # 初始化默认的通用对话系统
            self.llm_systems["general"] = init_system("general")
            logger.info("✅ LLM系统初始化成功")
        except Exception as e:
            logger.error(f"❌ LLM系统初始化失败: {str(e)}")
            raise
    
    def get_system_for_function(self, function_type: str):
        """
        获取指定功能的LLM系统实例
        
        参数:
            function_type (str): 功能类型标识
            
        返回:
            LLM系统实例
            
        功能:
        - 验证功能类型的有效性
        - 懒加载创建系统实例
        - 提供故障转移机制
        """
        # 验证功能类型，无效时默认使用通用功能
        if function_type not in self.valid_functions:
            logger.warning(f"⚠️ 无效的功能类型: {function_type}，使用默认通用功能")
            function_type = "general"
        
        # 懒加载：如果系统不存在则创建
        if function_type not in self.llm_systems:
            try:
                self.llm_systems[function_type] = init_system(function_type)
                logger.info(f"✅ 为功能 '{function_type}' 创建了新的LLM系统")
            except Exception as e:
                logger.error(f"❌ 为功能 '{function_type}' 创建系统失败: {str(e)}")
                # 故障转移：使用通用系统作为后备
                if "general" in self.llm_systems:
                    logger.info("🔄 使用通用系统作为后备")
                    return self.llm_systems["general"]
                raise
        
        return self.llm_systems[function_type]


# 全局应用状态实例
app_state = ApplicationState()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI应用生命周期管理
    
    负责应用的启动和关闭流程：
    - 启动时: 初始化系统依赖
    - 关闭时: 清理资源和连接
    """
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


# ========================= 静态文件服务 =========================
# 配置静态文件服务，用于提供上传的文档文件
app.mount("/static", StaticFiles(directory=Path(__file__).parent / "static"), name="static")


# ========================= 依赖注入函数 =========================

def get_app_state() -> ApplicationState:
    """
    依赖注入：获取应用状态
    
    Returns:
        ApplicationState: 全局应用状态实例，包含所有LLM系统
    """
    return app_state


def get_llm_system(function_type: str = "general"):
    """
    依赖注入：获取指定功能的LLM系统
    
    Args:
        function_type (str): 功能类型 ("general", "translator", "creative", "document")
        
    Returns:
        LLMSystem: 对应功能的LLM系统实例
    """
    return app_state.get_system_for_function(function_type)


# ========================= 对话相关端点 =========================

@app.post("/app", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest):
    """
    处理聊天请求的主要端点
    
    功能说明：
    - 接收用户的聊天消息和功能类型
    - 根据功能类型选择对应的LLM系统
    - 处理消息并返回AI回复
    - 支持多种对话模式（通用、翻译、创意、文档问答）
    
    Args:
        req (ChatRequest): 聊天请求对象，包含消息内容、功能类型、用户ID
        
    Returns:
        ChatResponse: 聊天响应对象，包含AI回复内容
        
    Raises:
        HTTPException: 当消息为空或处理过程中出现错误时
    """
    try:
        # 验证消息内容
        message = req.message.strip()
        if not message:
            return JSONResponse(
                status_code=400,
                content={"error": "消息不能为空"}
            )
        
        # 记录接收到的chat_history用于调试
        logger.info(f"=== 调试信息开始 ===")
        logger.info(f"请求用户ID: {req.user_id}")
        logger.info(f"请求功能类型: {req.function}")
        logger.info(f"请求消息: {req.message}")
        logger.info(f"接收到聊天历史，长度: {len(req.chat_history) if req.chat_history else 0}")
        if req.chat_history:
            logger.info(f"完整历史记录: {req.chat_history}")
            logger.info(f"最近3条历史: {req.chat_history[-3:]}")
        else:
            logger.info("chat_history为空或None")
        logger.info(f"=== 调试信息结束 ===")
        
        # 获取功能特定的LLM系统
        system = get_llm_system(req.function)
        
        # 调用LLM链处理消息并获取回复
        response = get_response(message, system, req.function, req.user_id, req.chat_history)
        
        return ChatResponse(response=response)
        
    except Exception as e:
        logger.error(f"聊天处理失败: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"服务器内部错误: {str(e)}"}
        )


@app.post("/app/stream")
async def chat_stream_endpoint(req: ChatRequest):
    """
    流式响应对话端点
    
    功能说明：
    - 处理需要流式输出的聊天请求
    - 实时返回AI生成的内容片段
    - 支持长文本生成和实时响应
    - 使用Server-Sent Events (SSE) 协议
    
    Args:
        req (ChatRequest): 聊天请求对象，包含消息内容、功能类型、用户ID
        
    Returns:
        StreamingResponse: 流式响应，逐步返回生成的内容
        
    Note:
        - 响应格式为SSE (Server-Sent Events)
        - 每个数据块以"data: "开头
        - 结束时发送"[DONE]"标记
    """
    try:
        # 验证消息内容
        message = req.message.strip()
        if not message:
            return JSONResponse(
                status_code=400,
                content={"error": "消息不能为空"}
            )
        
        # 记录接收到的chat_history用于调试
        logger.info(f"流式接收到聊天历史，长度: {len(req.chat_history) if req.chat_history else 0}")
        if req.chat_history:
            logger.info(f"最近3条历史: {req.chat_history[-3:]}")
        
        # 获取功能特定的LLM系统
        system = get_llm_system(req.function)
        
        async def generate():
            """
            生成流式响应的异步生成器
            
            Yields:
                str: SSE格式的数据块，包含生成的内容片段或错误信息
            """
            try:
                # 逐步获取LLM生成的内容片段
                async for chunk in get_response_stream(message, system, req.function, req.user_id, req.chat_history):
                    # 将内容片段包装为SSE格式
                    yield f"data: {json.dumps({'content': chunk}, ensure_ascii=False)}\n\n"
                
                # 发送结束标记
                yield f"data: [DONE]\n\n"
                
            except Exception as e:
                logger.error(f"流式响应生成失败: {str(e)}")
                # 发送错误信息
                yield f"data: {json.dumps({'error': str(e)}, ensure_ascii=False)}\n\n"
        
        return StreamingResponse(
            generate(),
            media_type="text/plain",
            headers={
                "Cache-Control": "no-cache",           # 禁用缓存
                "Connection": "keep-alive",            # 保持连接
                "Content-Type": "text/plain; charset=utf-8"  # 设置字符编码
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
async def clear_memory_endpoint(function_type: str = "current", user_id: str = "default"):
    """清除记忆端点"""
    try:
        if function_type == "current":
            # 向后兼容：清除默认系统记忆
            system = get_llm_system("general")
            clear_memory(system, user_id=user_id)
            logger.info(f"用户 {user_id} 的当前记忆已清除")
            return SuccessResponse(message=f"用户 {user_id} 的当前记忆已清除")
        else:
            # 清除指定功能的记忆
            from llm_chain import clear_memory_for_function
            clear_memory_for_function(function_type, user_id)
            logger.info(f"用户 {user_id} 的功能 {function_type} 记忆已清除")
            return SuccessResponse(message=f"用户 {user_id} 的功能 {function_type} 记忆已清除")
    except Exception as e:
        logger.error(f"清除记忆失败: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"清除记忆失败: {str(e)}"}
        )

@app.post("/memory/clear/{function_type}", response_model=SuccessResponse)
async def clear_function_memory_endpoint(function_type: str, user_id: str = "default"):
    """清除指定功能记忆端点"""
    try:
        from llm_chain import clear_memory_for_function
        clear_memory_for_function(function_type, user_id)
        logger.info(f"用户 {user_id} 的功能 {function_type} 记忆已清除")
        return SuccessResponse(message=f"用户 {user_id} 的功能 {function_type} 记忆已清除")
    except Exception as e:
        logger.error(f"清除记忆失败: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"清除记忆失败: {str(e)}"}
        )

@app.post("/memory/clear_user/{user_id}", response_model=SuccessResponse)
async def clear_user_memory_endpoint(user_id: str):
    """清除指定用户的所有记忆"""
    try:
        from llm_chain import clear_all_user_memories
        clear_all_user_memories(user_id)
        logger.info(f"用户 {user_id} 的所有记忆已清除")
        return SuccessResponse(message=f"用户 {user_id} 的所有记忆已清除")
    except Exception as e:
        logger.error(f"清除用户记忆失败: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"清除用户记忆失败: {str(e)}"}
        )

@app.get("/memory/users", response_model=dict)
async def get_active_users():
    """获取当前活跃用户数量"""
    try:
        from llm_chain import get_active_users_count
        count = get_active_users_count()
        return {"active_users": count, "message": f"当前有 {count} 个活跃用户"}
    except Exception as e:
        logger.error(f"获取活跃用户数量失败: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"获取活跃用户数量失败: {str(e)}"}
        )

# === 测试端点 ===

@app.get("/test")
async def test_endpoint():
    """测试端点"""
    return {"message": "后端服务正常运行", "status": "ok"}

@app.get("/test/upload-config")
async def test_upload_config():
    """测试上传配置"""
    return {
        "upload_dir": UPLOAD_DIR,
        "upload_dir_exists": os.path.exists(UPLOAD_DIR),
        "allowed_extensions": ALLOWED_EXTENSIONS,
        "status": "ok"
    }

# === 文档处理端点 ===

@app.post("/upload", response_model=UploadResponse)
async def upload_document(file: UploadFile = File(...), user_info: dict = Depends(get_current_user_simple)):
    """文档上传端点"""
    try:
        logger.info(f"用户 {user_info['user_id']} - 收到文件上传请求: {file.filename}")
        
        # 验证文件类型
        file_extension = os.path.splitext(file.filename)[1].lower()
        logger.info(f"用户 {user_info['user_id']} - 文件扩展名: {file_extension}")
        
        if file_extension not in ALLOWED_EXTENSIONS:
            logger.warning(f"用户 {user_info['user_id']} - 不支持的文件类型: {file_extension}")
            return JSONResponse(
                status_code=400,
                content={"error": f"不支持的文件类型。支持的类型: {', '.join(ALLOWED_EXTENSIONS)}"}
            )
        
        # 创建用户专属的上传目录
        user_upload_dir = os.path.join(UPLOAD_DIR, f"user_{user_info['user_id']}")
        os.makedirs(user_upload_dir, exist_ok=True)
        logger.info(f"用户 {user_info['user_id']} - 上传目录: {user_upload_dir}")
        
        # 保存文件到用户专属目录
        file_path = os.path.join(user_upload_dir, file.filename)
        logger.info(f"用户 {user_info['user_id']} - 准备保存文件到: {file_path}")
        
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
            logger.info(f"用户 {user_info['user_id']} - 文件保存成功: {file_path}, 大小: {len(content)} 字节")
        
        # 处理文档
        try:
            logger.info(f"用户 {user_info['user_id']} - 开始处理文档...")
            
            # 清除该用户现有的向量存储
            clear_user_document_data(str(user_info['user_id']))
            logger.info(f"用户 {user_info['user_id']} - 向量存储已清除")
            
            # 处理上传的文档
            documents = process_uploaded_file(file_path)
            logger.info(f"用户 {user_info['user_id']} - 文档处理完成: {len(documents)} 个文档")
            
            split_docs = split_documents(documents)
            logger.info(f"用户 {user_info['user_id']} - 文档分割完成: {len(split_docs)} 个块")
            
            # 初始化用户专属的向量存储
            init_vector_store(split_docs, str(user_info['user_id']))
            logger.info(f"用户 {user_info['user_id']} - 向量存储初始化完成")
            
            # 获取文档摘要
            summary = generate_document_summary(split_docs)
            logger.info(f"用户 {user_info['user_id']} - 文档摘要生成完成")
            
            return UploadResponse(
                message="文件上传并处理成功",
                filename=file.filename,
                summary=summary,
                page_count=len(documents),
                chunk_count=len(split_docs)
            )
            
        except Exception as e:
            logger.error(f"用户 {user_info['user_id']} - 文档处理失败: {str(e)}", exc_info=True)
            # 删除上传的文件
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"用户 {user_info['user_id']} - 已删除上传文件: {file_path}")
            return JSONResponse(
                status_code=500,
                content={"error": f"文档处理失败: {str(e)}"}
            )
        
    except Exception as e:
        logger.error(f"用户 {user_info['user_id']} - 文件上传失败: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"error": f"文件上传失败: {str(e)}"}
        )


@app.post("/documents/clear", response_model=SuccessResponse)
async def clear_documents():
    """清除所有文档端点"""
    try:
        clear_all_document_data()
        logger.info("所有文档已清除")
        return SuccessResponse(message="所有文档和上传文件已清除")
    except Exception as e:
        logger.error(f"清除文档失败: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"清除文档失败: {str(e)}"}
        )


@app.post("/uploads/clear", response_model=SuccessResponse)
async def clear_uploaded_files_endpoint():
    """清除所有上传文件端点"""
    try:
        from document_processing import clear_uploaded_files
        clear_uploaded_files()
        logger.info("所有上传文件已清除")
        return SuccessResponse(message="所有上传文件已清除")
    except Exception as e:
        logger.error(f"清除上传文件失败: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"清除上传文件失败: {str(e)}"}
        )


# === 认证相关端点 ===

@app.post("/login", response_model=SuccessResponse)
async def login_endpoint(req: LoginRequest):
    """用户登录端点"""
    try:
        # 使用新的数据库认证系统
        auth_result = auth_manager.authenticate_user(req.username, req.password)
        
        if auth_result["success"]:
            # 创建会话（传入用户信息）
            session_token = auth_manager.create_session(auth_result["user"])
            logger.info(f"用户 {req.username} 登录成功")
            
            response = JSONResponse(
                status_code=200,
                content={
                    "message": "登录成功", 
                    "session_token": session_token,
                    "user": auth_result["user"]
                }
            )
            response.set_cookie(key="session_token", value=session_token)
            return response
        else:
            logger.warning(f"用户 {req.username} 登录失败：{auth_result['message']}")
            return JSONResponse(
                status_code=401,
                content={"error": auth_result["message"]}
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
        # 使用新的数据库注册系统
        # 如果没有提供邮箱，使用用户名@example.com作为默认值
        email = req.email if req.email else f"{req.username}@example.com"
        
        register_result = auth_manager.register_user(
            username=req.username, 
            password=req.password,
            email=email
        )
        
        if register_result["success"]:
            logger.info(f"用户 {req.username} 注册成功，用户ID: {register_result['user_id']}")
            return SuccessResponse(message=register_result["message"])
        else:
            logger.warning(f"用户 {req.username} 注册失败：{register_result['message']}")
            return JSONResponse(
                status_code=400,
                content={"error": register_result["message"]}
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