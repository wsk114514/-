# config.py - 配置管理模块

import os
from pathlib import Path
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 基础路径配置
BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
TEMPLATES_DIR = os.path.join(BASE_DIR, "../my-react-app/templates")
STATIC_DIR = os.path.join(BASE_DIR, "../my-react-app/static")

# 确保上传目录存在
os.makedirs(UPLOAD_DIR, exist_ok=True)

# 环境配置
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

# 允许的文件扩展名
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
