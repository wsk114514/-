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
    
    负责管理整个应用的全局状态，采用单例模式设计，以确保全局唯一的状态管理器。
    主要职责包括：
    - LLM（大语言模型）系统实例的生命周期管理和缓存。
    - 基于功能类型（如“通用”、“文档问答”）的动态系统分发。
    - 应用启动时的资源预加载和初始化。
    """
    
    def __init__(self):
        """初始化应用状态管理器"""
        # 按功能类型缓存不同的LLM系统实例，实现懒加载
        self.llm_systems = {}
        
        # 定义应用支持的所有有效功能类型
        self.valid_functions = [
            "general",      # 通用助手
            "play",         # 游戏推荐
            "game_guide",   # 游戏攻略
            "doc_qa",       # 文档问答
            "game_wiki"     # 游戏百科
        ]
        logger.info("应用状态管理器已创建")
    
    def initialize(self):
        """
        初始化应用核心系统。
        
        在应用启动时由生命周期管理器调用，负责：
        1. 初始化默认的“通用”LLM系统，以备快速响应。
        2. 验证关键依赖（如模型配置）是否可用。
        3. 记录初始化状态，避免重复执行。
        """
        try:
            # 初始化默认的通用对话系统，作为基础和后备系统
            self.llm_systems["general"] = init_system("general")
            logger.info("✅ 默认LLM系统初始化成功")
        except Exception as e:
            logger.error(f"❌ LLM系统初始化失败: {str(e)}", exc_info=True)
            raise
    
    def get_system_for_function(self, function_type: str):
        """
        根据功能类型获取相应的LLM系统实例。
        
        该方法实现了懒加载和故障转移机制：
        - 如果请求的功能类型无效，则自动回退到“通用”功能。
        - 如果请求的系统实例尚未创建，则动态创建并缓存。
        - 如果创建失败，则尝试返回“通用”系统作为后备。
        
        参数:
            function_type (str): 功能类型标识符。
            
        返回:
            LangChain系统实例，用于处理特定类型的对话。
        """
        # 验证功能类型，若无效则使用默认的“通用”功能
        if function_type not in self.valid_functions:
            logger.warning(f"⚠️ 无效的功能类型: '{function_type}'，将使用默认的'general'功能。")
            function_type = "general"
        
        # 懒加载：如果系统实例不存在，则按需创建
        if function_type not in self.llm_systems:
            try:
                self.llm_systems[function_type] = init_system(function_type)
                logger.info(f"✅ 为功能 '{function_type}' 创建了新的LLM系统实例。")
            except Exception as e:
                logger.error(f"❌ 为功能 '{function_type}' 创建LLM系统实例失败: {str(e)}", exc_info=True)
                # 故障转移：创建失败时，尝试使用通用系统作为后备
                if "general" in self.llm_systems:
                    logger.info("🔄 创建失败，回退到使用通用的LLM系统。")
                    return self.llm_systems["general"]
                # 如果通用系统也不存在，则抛出异常
                raise
        
        return self.llm_systems[function_type]


# 全局应用状态实例
app_state = ApplicationState()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI应用生命周期管理函数。
    
    使用asynccontextmanager，此函数负责在应用启动和关闭时执行关键操作：
    - 启动时: 调用app_state.initialize()来预加载和初始化所有必要的资源，
      如默认的LLM系统，确保应用准备就绪可以接收请求。
    - 关闭时: 执行清理操作，例如关闭数据库连接、释放资源等（当前仅记录日志）。
    
    参数:
        app (FastAPI): FastAPI应用实例。
    """
    # 应用启动时执行
    logger.info("应用启动中，开始初始化核心资源...")
    app_state.initialize()
    
    yield
    
    # 应用关闭时执行
    logger.info("应用正在关闭，执行清理操作...")


# 初始化FastAPI应用实例
app = FastAPI(
    title="智能游戏对话系统",
    description="一个基于FastAPI和LangChain的多功能AI对话后端服务，提供游戏攻略、推荐、文档问答等多种功能。",
    version="1.0.1",
    lifespan=lifespan  # 注册生命周期管理函数
)


# 配置CORS（跨源资源共享）中间件
# 允许来自指定源的跨域请求，这对于前后端分离的应用至关重要。
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,  # 从config.py导入允许的源列表
    allow_credentials=True,      # 允许携带cookies
    allow_methods=["*"],         # 允许所有HTTP方法
    allow_headers=["*"],         # 允许所有请求头
)


# ========================= 静态文件服务 =========================
# 配置静态文件服务，用于提供上传的文档文件
app.mount("/static", StaticFiles(directory=Path(__file__).parent / "static"), name="static")


# ========================= 依赖注入函数 =========================

def get_app_state() -> ApplicationState:
    """
    依赖注入函数：获取全局应用状态实例。
    
    通过FastAPI的依赖注入系统，此函数为需要访问全局状态的端点
    （如LLM系统实例）提供统一的入口。
    
    返回:
        ApplicationState: 全局唯一的应用状态管理器实例。
    """
    return app_state


def get_llm_system(function_type: str = "general"):
    """
    依赖注入函数：根据功能类型获取LLM系统。
    
    此函数简化了在端点中获取特定功能LLM系统的过程。
    它从全局状态管理器中请求所需功能类型的系统实例。
    
    参数:
        function_type (str): 功能类型标识符，默认为 "general"。
        
    返回:
        一个配置好的LangChain系统实例，用于处理特定任务。
    """
    return app_state.get_system_for_function(function_type)


# ========================= 对话相关端点 =========================

@app.post("/app", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest):
    """
    标准聊天请求端点（非流式）。
    
    处理用户的单次聊天请求，并立即返回完整的AI回复。
    适用于不需要实时反馈的简短交互。
    
    功能流程:
    1. 验证请求数据的有效性（如消息不能为空）。
    2. 从请求中提取用户ID、功能类型和聊天历史。
    3. 使用`get_llm_system`获取与功能匹配的LLM系统。
    4. 调用`get_response`核心函数处理请求，生成回复。
    5. 记录详细的调试日志，包括输入和输出。
    
    参数:
        req (ChatRequest): 包含消息、功能、用户ID和历史记录的请求体。
        
    返回:
        ChatResponse: 包含AI完整回复内容的JSON响应。
        
    异常处理:
        - 如果消息为空，返回400错误。
        - 如果处理过程中发生任何其他错误，记录日志并返回500服务器错误。
    """
    try:
        # 验证消息内容是否为空
        message = req.message.strip()
        if not message:
            return JSONResponse(
                status_code=400,
                content={"error": "消息不能为空"}
            )
        
        # 记录详细的请求信息用于调试
        logger.info(f"=== 标准聊天请求 | 用户ID: {req.user_id} | 功能: {req.function} ===")
        logger.info(f"消息: {req.message}")
        logger.info(f"历史记录条数: {len(req.chat_history) if req.chat_history else 0}")
        
        # 获取功能特定的LLM系统
        system = get_llm_system(req.function)
        
        # 调用核心逻辑获取回复
        response = get_response(message, system, req.function, req.user_id, req.chat_history)
        
        return ChatResponse(response=response)
        
    except Exception as e:
        logger.error(f"聊天端点处理失败: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"error": f"服务器内部错误: {str(e)}"}
        )


@app.post("/app/stream")
async def chat_stream_endpoint(req: ChatRequest):
    """
    流式聊天请求端点。
    
    为需要实时反馈的交互提供流式响应。AI生成的内容会以数据块的形式
    通过Server-Sent Events (SSE)协议持续发送给客户端。
    
    功能流程:
    1. 验证请求消息的有效性。
    2. 获取与指定功能匹配的LLM系统。
    3. 定义一个异步生成器`generate`，该生成器调用`get_response_stream`。
    4. `get_response_stream`会逐步产生AI生成的文本块。
    5. 每个文本块被格式化为SSE事件并`yield`给客户端。
    6. 对话结束后，发送一个特殊的`[DONE]`标记。
    
    参数:
        req (ChatRequest): 包含消息、功能、用户ID和历史记录的请求体。
        
    返回:
        StreamingResponse: 一个SSE流，客户端可以逐块接收数据。
    """
    try:
        # 验证消息内容
        message = req.message.strip()
        if not message:
            return JSONResponse(
                status_code=400,
                content={"error": "消息不能为空"}
            )
        
        logger.info(f"=== 流式聊天请求 | 用户ID: {req.user_id} | 功能: {req.function} ===")
        
        # 获取功能特定的LLM系统
        system = get_llm_system(req.function)
        
        async def generate():
            """
            异步生成器，用于产生SSE事件流。
            
            Yields:
                str: 格式化为SSE规范的字符串，包含内容块或结束标记。
            """
            try:
                # 迭代从核心逻辑获取的流式响应块
                async for chunk in get_response_stream(message, system, req.function, req.user_id, req.chat_history):
                    # 将每个块格式化为SSE `data` 字段
                    yield f"data: {json.dumps({'content': chunk}, ensure_ascii=False)}\n\n"
                
                # 所有内容发送完毕后，发送结束标记
                yield f"data: [DONE]\n\n"
                
            except Exception as e:
                logger.error(f"流式响应生成过程中出错: {str(e)}", exc_info=True)
                # 在流中向客户端发送错误信息
                yield f"data: {json.dumps({'error': str(e)}, ensure_ascii=False)}\n\n"
        
        # 返回一个StreamingResponse，使用上面定义的生成器
        return StreamingResponse(
            generate(),
            media_type="text/event-stream",  # SSE的标准MIME类型
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Content-Type": "text/event-stream; charset=utf-8"
            }
        )
        
    except Exception as e:
        logger.error(f"流式聊天端点处理失败: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"error": f"流式对话启动失败: {str(e)}"}
        )


# === 记忆管理端点 ===

@app.post("/memory/clear", response_model=SuccessResponse)
async def clear_memory_endpoint(function_type: str = "current", user_id: str = "default"):
    """
    清除指定用户和功能的对话记忆。
    
    此端点用于重置特定对话上下文的记忆，允许用户开始新的对话。
    支持清除当前功能（向后兼容）或指定功能的记忆。
    
    参数:
        function_type (str): 要清除记忆的功能类型。默认为"current"，
                             会清除"general"系统的记忆。
        user_id (str): 目标用户的ID。
        
    返回:
        SuccessResponse: 操作成功的确认消息。
    """
    try:
        if function_type == "current":
            # 向后兼容：清除默认"general"系统的记忆
            from llm_chain import clear_memory_for_function
            clear_memory_for_function("general", user_id)
            logger.info(f"用户 {user_id} 的 'general' 功能记忆已清除。")
            return SuccessResponse(message=f"用户 {user_id} 的当前记忆已清除")
        else:
            # 清除指定功能的记忆
            from llm_chain import clear_memory_for_function
            clear_memory_for_function(function_type, user_id)
            logger.info(f"用户 {user_id} 的 '{function_type}' 功能记忆已清除。")
            return SuccessResponse(message=f"用户 {user_id} 的功能 '{function_type}' 记忆已清除")
    except Exception as e:
        logger.error(f"清除记忆失败: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"error": f"清除记忆失败: {str(e)}"}
        )

@app.post("/memory/clear_user/{user_id}", response_model=SuccessResponse)
async def clear_user_memory_endpoint(user_id: str):
    """
    清除指定用户的所有对话记忆。
    
    此端点会遍历该用户在所有功能下的全部对话历史并予以清除，
    实现对用户数据的完全重置。
    
    参数:
        user_id (str): 要清除所有记忆的目标用户的ID。
        
    返回:
        SuccessResponse: 操作成功的确认消息。
    """
    try:
        from llm_chain import clear_all_user_memories
        clear_all_user_memories(user_id)
        logger.info(f"用户 {user_id} 的所有功能记忆已全部清除。")
        return SuccessResponse(message=f"用户 {user_id} 的所有记忆已清除")
    except Exception as e:
        logger.error(f"清除用户所有记忆失败: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"error": f"清除用户记忆失败: {str(e)}"}
        )

@app.get("/memory/users", response_model=dict)
async def get_active_users():
    """
    获取当前具有活动记忆的用户数量。
    
    此端点用于监控系统状态，返回在至少一个功能中存在对话记忆的
    独立用户总数。
    
    返回:
        dict: 包含活跃用户数量和描述消息的字典。
    """
    try:
        from llm_chain import get_active_users_count
        count = get_active_users_count()
        return {"active_users": count, "message": f"当前有 {count} 个活跃用户"}
    except Exception as e:
        logger.error(f"获取活跃用户数失败: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"error": f"获取活跃用户数量失败: {str(e)}"}
        )

# === 测试端点 ===

@app.get("/test")
async def test_endpoint():
    """
    基础服务可用性测试端点。
    
    用于验证后端服务是否正在运行且能够响应HTTP请求。
    常用于负载均衡器、容器编排系统（如Kubernetes）的存活探针。
    
    返回:
        dict: 一个包含成功消息和状态的JSON对象。
    """
    return {"message": "后端服务正常运行", "status": "ok"}

@app.get("/test/upload-config")
async def test_upload_config():
    """
    测试文件上传配置的端点。
    
    用于诊断文件上传功能相关的配置问题。它会返回上传目录的路径、
    该目录是否存在以及允许上传的文件扩展名列表。
    
    返回:
        dict: 包含上传配置详情的JSON对象。
    """
    return {
        "upload_dir": UPLOAD_DIR,
        "upload_dir_exists": os.path.exists(UPLOAD_DIR),
        "allowed_extensions": ALLOWED_EXTENSIONS,
        "status": "ok"
    }


# === 文档处理端点 ===

@app.post("/upload", response_model=UploadResponse)
async def upload_document(file: UploadFile = File(...), user_info: dict = Depends(get_current_user_simple)):
    """
    文档上传与处理端点。
    
    这是实现RAG（检索增强生成）功能的核心入口。用户通过此端点上传文档
    （如PDF、TXT），后端会进行处理并将其存储到向量数据库中，以备后续问答。
    
    处理流程:
    1. 验证文件类型是否在允许列表中。
    2. 为每个用户创建独立的上传目录，以隔离数据。
    3. 保存上传的文件。
    4. **关键步骤**:
       a. 清除该用户之前上传的旧文档数据（向量存储）。
       b. 使用`document_processing`模块解析文件内容。
       c. 将解析后的文本分割成小块（chunks）。
       d. 使用这些文本块初始化或更新用户的向量存储。
       e. 生成文档摘要，为用户提供快速概览。
    5. 如果任何步骤失败，则回滚操作（如删除已上传的文件）并返回错误。
    
    参数:
        file (UploadFile): 用户上传的文件。
        user_info (dict): 通过依赖注入获取的当前用户信息。
        
    返回:
        UploadResponse: 包含成功消息、文件名、摘要和统计信息的响应。
    """
    try:
        logger.info(f"用户 {user_info['user_id']} - 收到文件上传请求: {file.filename}")
        
        # 验证文件扩展名
        file_extension = os.path.splitext(file.filename)[1].lower()
        if file_extension not in ALLOWED_EXTENSIONS:
            logger.warning(f"用户 {user_info['user_id']} - 不支持的文件类型: {file_extension}")
            return JSONResponse(
                status_code=400,
                content={"error": f"不支持的文件类型。支持的类型: {', '.join(ALLOWED_EXTENSIONS)}"}
            )
        
        # 为用户创建专属上传目录
        user_upload_dir = os.path.join(UPLOAD_DIR, f"user_{user_info['user_id']}")
        os.makedirs(user_upload_dir, exist_ok=True)
        
        # 保存文件
        file_path = os.path.join(user_upload_dir, file.filename)
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
            logger.info(f"用户 {user_info['user_id']} - 文件已保存: {file_path}")
        
        # 处理文档并构建向量存储
        try:
            logger.info(f"用户 {user_info['user_id']} - 开始处理文档并构建向量库...")
            
            # 清除该用户旧的向量数据
            clear_user_document_data(str(user_info['user_id']))
            
            # 解析、分割并存储文档
            documents = process_uploaded_file(file_path)
            split_docs = split_documents(documents)
            init_vector_store(split_docs, str(user_info['user_id']))
            
            # 生成文档摘要
            summary = generate_document_summary(split_docs)
            
            logger.info(f"用户 {user_info['user_id']} - 文档处理成功。")
            return UploadResponse(
                message="文件上传并处理成功",
                filename=file.filename,
                summary=summary,
                page_count=len(documents),
                chunk_count=len(split_docs)
            )
            
        except Exception as e:
            logger.error(f"用户 {user_info['user_id']} - 文档处理失败: {str(e)}", exc_info=True)
            # 清理失败时上传的文件
            if os.path.exists(file_path):
                os.remove(file_path)
            return JSONResponse(
                status_code=500,
                content={"error": f"文档处理失败: {str(e)}"}
            )
        
    except Exception as e:
        logger.error(f"文件上传端点失败: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"error": f"文件上传失败: {str(e)}"}
        )


@app.post("/documents/clear", response_model=SuccessResponse)
async def clear_documents():
    """
    清除所有用户的文档数据和上传文件。
    
    这是一个管理端点，用于完全重置系统的文档库。它会删除所有
    ChromaDB中的向量数据和存储在服务器上的所有上传文件。
    **警告**: 这是一个破坏性操作。
    
    返回:
        SuccessResponse: 操作成功的确认消息。
    """
    try:
        clear_all_document_data()
        logger.info("所有文档数据和上传文件已清除。")
        return SuccessResponse(message="所有文档和上传文件已清除")
    except Exception as e:
        logger.error(f"清除文档失败: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"error": f"清除文档失败: {str(e)}"}
        )


@app.post("/uploads/clear", response_model=SuccessResponse)
async def clear_uploaded_files_endpoint():
    """
    仅清除所有上传的物理文件。
    
    此端点用于清理服务器磁盘空间，它会删除`uploads`目录下的所有文件，
    但不会触及向量数据库中的数据。
    
    返回:
        SuccessResponse: 操作成功的确认消息。
    """
    try:
        from document_processing import clear_uploaded_files
        clear_uploaded_files()
        logger.info("所有上传的物理文件已清除。")
        return SuccessResponse(message="所有上传文件已清除")
    except Exception as e:
        logger.error(f"清除上传文件失败: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"error": f"清除上传文件失败: {str(e)}"}
        )


# === 认证相关端点 ===

@app.post("/login", response_model=SuccessResponse)
async def login_endpoint(req: LoginRequest):
    """
    用户登录端点。
    
    通过用户名和密码对用户进行身份验证。
    成功后，会创建一个会话，并将会话令牌（session_token）通过HTTP-only cookie
    和响应体返回给客户端。
    
    参数:
        req (LoginRequest): 包含用户名和密码的请求体。
        
    返回:
        - 成功: 包含成功消息、会话令牌和用户信息的JSON响应，并设置cookie。
        - 失败: 401 Unauthorized错误响应。
    """
    try:
        # 使用认证管理器验证凭据
        auth_result = auth_manager.authenticate_user(req.username, req.password)
        
        if auth_result["success"]:
            # 创建会话并获取令牌
            session_token = auth_manager.create_session(auth_result["user"])
            logger.info(f"用户 '{req.username}' 登录成功。")
            
            # 构建成功响应
            response = JSONResponse(
                status_code=200,
                content={
                    "message": "登录成功", 
                    "session_token": session_token,
                    "user": auth_result["user"]
                }
            )
            # 在cookie中设置会话令牌，增强安全性
            response.set_cookie(key="session_token", value=session_token, httponly=True)
            return response
        else:
            logger.warning(f"用户 '{req.username}' 登录失败: {auth_result['message']}")
            return JSONResponse(
                status_code=401,
                content={"error": auth_result["message"]}
            )
    except Exception as e:
        logger.error(f"登录处理失败: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"error": f"登录过程中发生服务器错误: {str(e)}"}
        )


@app.post("/register", response_model=SuccessResponse)
async def register_endpoint(req: RegisterRequest):
    """
    用户注册端点。
    
    接收新用户的注册信息（用户名、密码、可选的邮箱），并尝试在数据库中
    创建一个新用户账户。
    
    参数:
        req (RegisterRequest): 包含注册信息的请求体。
        
    返回:
        - 成功: 包含成功消息的JSON响应。
        - 失败: 400 Bad Request错误，通常因为用户名已存在。
    """
    try:
        # 如果未提供邮箱，则生成一个默认值
        email = req.email if req.email else f"{req.username}@example.com"
        
        # 使用认证管理器注册新用户
        register_result = auth_manager.register_user(
            username=req.username, 
            password=req.password,
            email=email
        )
        
        if register_result["success"]:
            logger.info(f"新用户 '{req.username}' 注册成功。")
            return SuccessResponse(message=register_result["message"])
        else:
            logger.warning(f"用户 '{req.username}' 注册失败: {register_result['message']}")
            return JSONResponse(
                status_code=400,
                content={"error": register_result["message"]}
            )
    except Exception as e:
        logger.error(f"注册处理失败: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"error": f"注册过程中发生服务器错误: {str(e)}"}
        )


# === 健康检查与根路径 ===

@app.get("/health")
async def health_check():
    """
    详细健康检查端点。
    
    提供比/test更详细的系统状态信息，包括运行环境和关键组件
    （如LLM系统）的初始化状态。
    常用于部署管道中的就绪探针（readiness probe）。
    
    返回:
        dict: 包含系统健康状态、环境和组件状态的JSON对象。
    """
    return {
        "status": "healthy",
        "environment": ENVIRONMENT,
        "llm_systems_initialized": "general" in app_state.llm_systems
    }


@app.get("/")
async def root():
    """
    API根路径端点。
    
    访问API的根URL时，返回一个欢迎消息，确认服务正在运行。
    
    返回:
        dict: 包含欢迎消息的JSON对象。
    """
    return {"message": "智能游戏对话系统 API 服务正在运行"}


if __name__ == "__main__":
    # 当该脚本作为主程序直接运行时，启动Uvicorn服务器。
    # 这对于本地开发和调试非常方便。
    # 在生产环境中，通常会使用Gunicorn等更专业的ASGI服务器来运行应用。
    import uvicorn
    uvicorn.run(
        "main:app",      # ASGI应用的位置: 文件名:FastAPI实例名
        host="0.0.0.0",  # 监听所有网络接口
        port=8000,       # 监听8000端口
        reload=True,     # 代码变更时自动重启服务器（仅限开发）
        log_level="info" # 设置日志级别
    )