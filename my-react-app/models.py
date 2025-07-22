# models.py - 数据模型定义模块

from pydantic import BaseModel
from typing import Optional

class ChatRequest(BaseModel):
    """聊天请求模型"""
    message: str
    function: str
    user_id: Optional[str] = "default"  # 添加用户ID支持

class ChatResponse(BaseModel):
    """聊天响应模型"""
    response: str
    message_id: Optional[str] = None

class LoginRequest(BaseModel):
    """登录请求模型"""
    username: str
    password: str

class RegisterRequest(BaseModel):
    """注册请求模型"""
    username: str
    password: str

class UploadResponse(BaseModel):
    """文件上传响应模型"""
    message: str
    filename: str
    summary: str
    page_count: int
    chunk_count: int

class ErrorResponse(BaseModel):
    """错误响应模型"""
    error: str
    detail: Optional[str] = None

class SuccessResponse(BaseModel):
    """成功响应模型"""
    message: str
    data: Optional[dict] = None
