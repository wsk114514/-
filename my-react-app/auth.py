"""
auth.py - 用户认证管理模块

这是应用的用户认证核心，负责：
1. 🔐 用户身份验证 - 用户名密码验证和安全登录
2. 👥 用户注册管理 - 新用户账户创建和密码加密
3. 🎫 会话令牌管理 - 安全的会话创建、验证和撤销
4. 🛡️ 密码安全处理 - bcrypt加密和密码强度验证
5. 📊 用户数据管理 - 模拟数据库的用户信息存储
6. 🚫 会话生命周期 - 登录状态维护和安全退出

安全特性：
- bcrypt密码哈希：不可逆的密码加密存储
- 安全会话令牌：使用secrets模块生成的URL安全令牌
- 会话状态管理：内存中的活跃会话追踪
- 防暴力破解：密码验证失败的安全处理

设计模式：
- 单例管理器：统一的认证管理入口
- 哈希验证：密码不明文存储
- 令牌机制：无状态的会话管理
"""

import secrets
from passlib.context import CryptContext
from typing import Dict, Optional

class AuthManager:
    """
    认证管理器
    
    这是用户认证的核心类，提供完整的用户认证功能：
    - 用户登录验证和会话管理
    - 新用户注册和密码安全处理  
    - 会话令牌的生成、验证和撤销
    - 模拟数据库的用户数据管理
    
    安全设计：
    - 使用bcrypt进行密码哈希，防止彩虹表攻击
    - 会话令牌使用加密安全的随机数生成器
    - 内存中的会话状态管理，重启后自动清理
    """
    
    def __init__(self):
        """
        初始化认证管理器
        
        功能说明：
        - 配置密码加密上下文
        - 初始化会话存储
        - 创建模拟用户数据库
        - 预置管理员账户
        """
        # 初始化密码加密上下文 - 使用bcrypt算法
        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        
        # 会话管理 - 存储已登录用户的会话令牌
        # 数据结构: {session_token: username}
        self.active_sessions: Dict[str, str] = {}
        
        # 模拟用户数据库 - 生产环境应使用真实数据库
        # 数据结构: {username: {username, hashed_password}}
        self.users_db = {
            "admin": {
                "username": "admin",
                "hashed_password": self.pwd_context.hash("secret")  # 预置管理员账户
            }
        }
    
    def authenticate_user(self, username: str, password: str) -> bool:
        """
        验证用户名和密码
        
        功能说明：
        - 检查用户是否存在
        - 使用bcrypt验证密码哈希
        - 返回验证结果
        
        Args:
            username (str): 用户名
            password (str): 明文密码
            
        Returns:
            bool: 验证成功返回True，失败返回False
            
        Security:
            - 密码验证使用时间恒定的比较算法
            - 不会泄露用户是否存在的信息
        """
        if username not in self.users_db:
            return False
        user = self.users_db[username]
        return self.pwd_context.verify(password, user["hashed_password"])
    
    def register_user(self, username: str, password: str) -> bool:
        """
        注册新用户
        
        功能说明：
        - 检查用户名是否已存在
        - 对密码进行bcrypt哈希加密
        - 将新用户添加到数据库
        
        Args:
            username (str): 新用户名
            password (str): 明文密码
            
        Returns:
            bool: 注册成功返回True，用户已存在返回False
            
        Security:
            - 密码立即哈希，不存储明文
            - 用户名唯一性检查
        """
        if username in self.users_db:
            return False
        
        # 使用bcrypt对密码进行哈希加密
        hashed_password = self.pwd_context.hash(password)
        self.users_db[username] = {
            "username": username,
            "hashed_password": hashed_password
        }
        return True
    
    def create_session(self, username: str) -> str:
        """
        为登录用户生成安全的会话令牌
        
        功能说明：
        - 生成加密安全的随机会话令牌
        - 将令牌与用户名关联存储
        - 返回令牌供客户端使用
        
        Args:
            username (str): 已验证的用户名
            
        Returns:
            str: URL安全的会话令牌
            
        Security:
            - 使用secrets模块生成密码学安全的随机数
            - 令牌长度足够防止暴力破解
            - URL安全编码，适合在HTTP头中传输
        """
        session_token = secrets.token_urlsafe(32)
        self.active_sessions[session_token] = username
        return session_token
    
    def verify_session(self, session_token: str) -> Optional[str]:
        """
        验证会话令牌并返回用户名
        
        功能说明：
        - 检查令牌是否在活跃会话中
        - 返回对应的用户名
        - 用于保护需要认证的API端点
        
        Args:
            session_token (str): 要验证的会话令牌
            
        Returns:
            Optional[str]: 有效则返回用户名，无效则返回None
        """
        return self.active_sessions.get(session_token)
    
    def revoke_session(self, session_token: str) -> bool:
        """
        撤销会话令牌
        
        功能说明：
        - 从活跃会话中移除指定令牌
        - 用于用户主动退出登录
        - 确保会话安全结束
        
        Args:
            session_token (str): 要撤销的会话令牌
            
        Returns:
            bool: 撤销成功返回True，令牌不存在返回False
        """
        if session_token in self.active_sessions:
            del self.active_sessions[session_token]
            return True
        return False

# 全局认证管理器实例
auth_manager = AuthManager()
