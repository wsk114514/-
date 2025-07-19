# auth.py - 认证管理模块

import secrets
from passlib.context import CryptContext
from typing import Dict, Optional

class AuthManager:
    """认证管理器"""
    
    def __init__(self):
        # 初始化密码加密上下文
        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        
        # 会话管理 - 存储已登录用户的会话令牌
        self.active_sessions: Dict[str, str] = {}
        
        # 模拟用户数据库
        self.users_db = {
            "admin": {
                "username": "admin",
                "hashed_password": self.pwd_context.hash("secret")
            }
        }
    
    def authenticate_user(self, username: str, password: str) -> bool:
        """验证用户名和密码"""
        if username not in self.users_db:
            return False
        user = self.users_db[username]
        return self.pwd_context.verify(password, user["hashed_password"])
    
    def register_user(self, username: str, password: str) -> bool:
        """注册新用户"""
        if username in self.users_db:
            return False
        
        hashed_password = self.pwd_context.hash(password)
        self.users_db[username] = {
            "username": username,
            "hashed_password": hashed_password
        }
        return True
    
    def create_session(self, username: str) -> str:
        """为登录用户生成安全的会话令牌"""
        session_token = secrets.token_urlsafe(32)
        self.active_sessions[session_token] = username
        return session_token
    
    def verify_session(self, session_token: str) -> Optional[str]:
        """验证会话令牌并返回用户名"""
        return self.active_sessions.get(session_token)
    
    def revoke_session(self, session_token: str) -> bool:
        """撤销会话令牌"""
        if session_token in self.active_sessions:
            del self.active_sessions[session_token]
            return True
        return False

# 全局认证管理器实例
auth_manager = AuthManager()
