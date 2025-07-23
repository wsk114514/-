"""
models.py - Pydantic数据模型定义模块

这是应用的数据结构定义中心，负责：
1. 📋 API请求/响应模型 - 定义所有API端点的数据格式
2. ✅ 数据验证规则 - 自动验证输入数据的类型和格式
3. 📚 文档自动生成 - 为FastAPI自动生成API文档
4. 🔄 序列化/反序列化 - JSON与Python对象的转换
5. 🛡️ 类型安全保证 - 编译时和运行时的类型检查
6. 📝 字段约束定义 - 数据长度、格式、必填等约束

技术特色：
- Pydantic v2: 现代Python数据验证库
- 类型注解: 完整的类型提示支持
- 自动文档: 集成到FastAPI的自动文档生成
- 验证错误: 友好的错误消息和详细定位

设计原则：
- 单一职责: 每个模型只负责一种数据结构
- 向前兼容: 可选字段支持API演进
- 清晰命名: 模型名称直观反映用途
"""

from pydantic import BaseModel
from typing import Optional

# ========================= 对话相关模型 =========================

class ChatRequest(BaseModel):
    """
    聊天请求模型
    
    定义客户端发送聊天消息时的数据结构：
    - 用户输入的消息内容
    - 指定的功能类型（游戏推荐、攻略等）
    - 用户身份标识
    
    用途：
    - /app 和 /app/stream 端点的请求体
    - 数据验证和类型检查
    - API文档自动生成
    """
    message: str                           # 用户输入的消息内容，必填
    function: str                          # 功能类型：general/play/game_guide/doc_qa/game_wiki
    user_id: Optional[str] = "default"     # 用户标识符，用于多用户支持

class ChatResponse(BaseModel):
    """
    聊天响应模型
    
    定义AI回复消息的数据结构：
    - AI生成的回复内容
    - 消息的唯一标识符（用于重新生成等功能）
    
    用途：
    - /app 端点的响应体
    - 统一的响应格式
    """
    response: str                          # AI生成的回复内容
    message_id: Optional[str] = None       # 消息唯一标识符，可选

# ========================= 用户认证模型 =========================

class LoginRequest(BaseModel):
    """
    登录请求模型
    
    定义用户登录时提交的数据结构：
    - 用户名和密码字段
    - 用于身份验证
    
    安全考虑：
    - 密码字段不会出现在日志中
    - 仅用于传输，不存储明文密码
    """
    username: str                          # 用户名，必填
    password: str                          # 密码，必填（明文传输，服务端加密）

class RegisterRequest(BaseModel):
    """
    注册请求模型
    
    定义新用户注册时提交的数据结构：
    - 与登录模型相同的字段结构
    - 用于创建新用户账户
    
    扩展性：
    - 未来可添加邮箱、手机号等字段
    - 支持更复杂的用户信息收集
    """
    username: str                          # 新用户名，必填且唯一
    password: str                          # 新密码，必填

# ========================= 文件处理模型 =========================

class UploadResponse(BaseModel):
    """
    文件上传响应模型
    
    定义文档上传成功后的响应数据结构：
    - 上传状态和文件信息
    - 文档处理结果摘要
    - 向量化统计信息
    
    用途：
    - /upload 端点的成功响应
    - 向用户反馈处理结果
    """
    message: str                           # 操作成功消息
    filename: str                          # 上传的文件名
    summary: str                           # 文档内容摘要
    page_count: int                        # 文档页数（PDF）或字符数（TXT）
    chunk_count: int                       # 分割后的文本块数量

# ========================= 通用响应模型 =========================

class ErrorResponse(BaseModel):
    """
    错误响应模型
    
    定义API错误时的统一响应格式：
    - 错误消息和详细信息
    - 便于客户端错误处理
    
    用途：
    - 所有API端点的错误响应
    - 统一的错误格式
    """
    error: str                             # 错误消息，简短描述
    detail: Optional[str] = None           # 详细错误信息，可选

class SuccessResponse(BaseModel):
    """
    成功响应模型
    
    定义操作成功时的通用响应格式：
    - 成功消息和可选的附加数据
    - 用于不需要特定响应结构的操作
    
    用途：
    - 记忆清除、用户操作等端点
    - 简单的成功确认
    """
    message: str                           # 成功操作消息
    data: Optional[dict] = None            # 可选的附加数据
