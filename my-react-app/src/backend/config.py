"""
config.py - 配置管理模块

这是应用的核心配置中心，负责：
1. 📁 路径配置管理 - 统一管理应用中的所有路径
2. 🌍 环境变量加载 - 支持.env文件和系统环境变量
3. 🔒 安全配置设置 - CORS、文件类型限制等安全策略
4. 🗄️ 数据库连接配置 - 数据库URL和连接参数
5. 📝 日志系统配置 - 日志级别和输出格式
6. 🔧 开发/生产环境区分 - 不同环境的配置切换

设计原则:
- 单一配置源：所有配置集中管理
- 环境敏感：支持开发、测试、生产环境
- 安全第一：敏感信息通过环境变量加载
- 向后兼容：配置变更不影响现有功能
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# ========================= 环境变量加载 =========================

# 加载.env文件中的环境变量
# 优先级：环境变量 > .env文件 > 默认值
load_dotenv()

# ========================= 路径配置 =========================

# 基础路径配置 - 应用根目录
BASE_DIR = Path(__file__).resolve().parent

# 文件上传存储目录
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")

# 模板文件目录（如果使用服务端渲染）
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")

# 静态文件服务目录
STATIC_DIR = os.path.join(BASE_DIR, "static")

# 确保关键目录存在
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ========================= 环境配置 =========================

# 运行环境：development/testing/production
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

# ========================= 文件处理配置 =========================

# 允许上传的文件扩展名
# 出于安全考虑，严格限制文件类型
ALLOWED_EXTENSIONS = ['.txt', '.pdf', '.docx', '.doc']

# CORS配置
CORS_ORIGINS = ["http://localhost:3000"]

# 数据库配置（如果需要）
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")

# 日志配置
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

# API配置
API_VERSION = "v1"
API_PREFIX = f"/api/{API_VERSION}"

# ========================= 聊天记录配置 =========================

# 聊天记录管理配置
CHAT_HISTORY_CONFIG = {
    # 每个用户最大保存的聊天会话数量
    "MAX_HISTORIES_PER_USER": 50,
    
    # 聊天记录存储键前缀
    "STORAGE_KEY_PREFIX": "chat_histories",
    
    # 游客用户的存储键后缀
    "GUEST_SUFFIX": "guest",
    
    # 是否启用用户独立聊天记录
    "USER_ISOLATION_ENABLED": True
}
