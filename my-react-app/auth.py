"""
auth.py - 用户认证管理模块

这是应用的用户认证核心，负责：
1. 🔐 用户身份验证 - 数据库驱动的用户名密码验证
2. 👥 用户注册管理 - 新用户账户创建和数据库存储
3. 🎫 会话令牌管理 - 安全的会话创建、验证和撤销
4. 🛡️ 密码安全处理 - 数据库级别的密码加密
5. 📊 用户数据管理 - SQLite数据库的用户信息管理
6. 🚫 会话生命周期 - 登录状态维护和安全退出

安全特性：
- 数据库密码哈希：使用PBKDF2和盐值的密码加密
- 安全会话令牌：使用secrets模块生成的URL安全令牌
- 会话状态管理：内存中的活跃会话追踪
- 用户数据持久化：SQLite数据库存储用户信息

设计模式：
- 数据库集成：与UserDatabase类的无缝集成
- 统一认证接口：保持API兼容性
- 会话管理：内存会话配合数据库用户管理
"""

import secrets
from typing import Dict, Optional
from database import get_user_database, UserDatabase
import logging

# ========================= 日志配置 =========================
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AuthManager:
    """
    认证管理器 (数据库版本)
    
    这是用户认证的核心类，提供完整的用户认证功能：
    - 数据库驱动的用户登录验证和会话管理
    - 新用户注册和数据库存储
    - 会话令牌的生成、验证和撤销
    - 与UserDatabase的集成管理
    
    安全设计：
    - 使用数据库的PBKDF2+盐值进行密码哈希
    - 会话令牌使用加密安全的随机数生成器
    - 数据持久化存储，重启后保持用户数据
    """
    
    def __init__(self):
        """
        初始化认证管理器
        
        功能说明：
        - 获取数据库实例
        - 初始化会话存储
        - 创建默认管理员账户（如果不存在）
        """
        # 获取数据库实例
        self.db: UserDatabase = get_user_database()
        
        # 会话管理 - 存储已登录用户的会话令牌
        # 数据结构: {session_token: user_info}
        self.active_sessions: Dict[str, Dict] = {}
        
        # 确保默认管理员账户存在
        self._ensure_admin_user()
    
    def _ensure_admin_user(self):
        """确保默认管理员账户存在"""
        try:
            # 检查是否已存在管理员用户
            result = self.db.authenticate_user("admin", "admin123")
            if not result["success"]:
                # 创建默认管理员账户
                result = self.db.create_user(
                    username="admin",
                    email="admin@sleepgaminglib.com",
                    password="admin123",
                    full_name="系统管理员"
                )
                if result["success"]:
                    # 设置为管理员
                    with self.db._get_db_connection() as conn:
                        cursor = conn.cursor()
                        cursor.execute(
                            'UPDATE users SET is_admin = TRUE WHERE username = ?',
                            ("admin",)
                        )
                        conn.commit()
                    logger.info("默认管理员账户创建成功")
                else:
                    logger.warning(f"创建默认管理员账户失败: {result['message']}")
        except Exception as e:
            logger.error(f"确保管理员账户时出错: {str(e)}")
    
    def authenticate_user(self, username: str, password: str) -> Dict:
        """
        验证用户名和密码
        
        功能说明：
        - 使用数据库验证用户凭据
        - 返回详细的验证结果
        - 包含用户信息（如果验证成功）
        
        Args:
            username (str): 用户名或邮箱
            password (str): 明文密码
            
        Returns:
            Dict: 验证结果 {"success": bool, "message": str, "user": dict}
        """
        try:
            result = self.db.authenticate_user(username, password)
            if result["success"]:
                logger.info(f"用户认证成功: {username}")
            else:
                logger.warning(f"用户认证失败: {username} - {result['message']}")
            return result
        except Exception as e:
            logger.error(f"用户认证过程中出错: {str(e)}")
            return {"success": False, "message": "认证过程中发生错误"}
    
    def register_user(self, username: str, password: str, email: str, **kwargs) -> Dict:
        """
        注册新用户
        
        功能说明：
        - 使用数据库创建新用户账户
        - 支持额外的用户信息字段
        - 返回详细的注册结果
        
        Args:
            username (str): 新用户名
            password (str): 明文密码
            email (str): 用户邮箱
            **kwargs: 其他用户信息（如full_name, avatar_url）
            
        Returns:
            Dict: 注册结果 {"success": bool, "message": str, "user_id": int}
        """
        try:
            result = self.db.create_user(username, email, password, **kwargs)
            if result["success"]:
                logger.info(f"新用户注册成功: {username}")
            else:
                logger.warning(f"用户注册失败: {username} - {result['message']}")
            return result
        except Exception as e:
            logger.error(f"用户注册过程中出错: {str(e)}")
            return {"success": False, "message": "注册过程中发生错误"}
    
    def create_session(self, user_info: Dict) -> str:
        """
        为登录用户生成安全的会话令牌
        
        功能说明：
        - 生成加密安全的随机会话令牌
        - 将令牌与用户信息关联存储
        - 返回令牌供客户端使用
        
        Args:
            user_info (Dict): 已验证的用户信息
            
        Returns:
            str: URL安全的会话令牌
        """
        try:
            session_token = secrets.token_urlsafe(32)
            self.active_sessions[session_token] = {
                "user": user_info,
                "created_at": secrets.token_hex(8)  # 简单的时间戳替代
            }
            logger.info(f"会话创建成功: 用户 {user_info.get('username', 'unknown')}")
            return session_token
        except Exception as e:
            logger.error(f"创建会话时出错: {str(e)}")
            return ""
    
    def verify_session(self, session_token: str) -> Optional[Dict]:
        """
        验证会话令牌并返回用户信息
        
        功能说明：
        - 检查令牌是否在活跃会话中
        - 返回对应的用户信息
        - 用于保护需要认证的API端点
        
        Args:
            session_token (str): 要验证的会话令牌
            
        Returns:
            Optional[Dict]: 有效则返回用户信息，无效则返回None
        """
        session_info = self.active_sessions.get(session_token)
        return session_info["user"] if session_info else None
    
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
            user = self.active_sessions[session_token]["user"]
            del self.active_sessions[session_token]
            logger.info(f"会话已撤销: 用户 {user.get('username', 'unknown')}")
            return True
        return False
    
    def get_user_by_id(self, user_id: int) -> Optional[Dict]:
        """
        根据用户ID获取用户信息
        
        Args:
            user_id (int): 用户ID
            
        Returns:
            Optional[Dict]: 用户信息或None
        """
        return self.db.get_user_by_id(user_id)
    
    def update_user(self, user_id: int, **kwargs) -> Dict:
        """
        更新用户信息
        
        Args:
            user_id (int): 用户ID
            **kwargs: 要更新的字段
            
        Returns:
            Dict: 更新结果
        """
        return self.db.update_user(user_id, **kwargs)
    
    def change_password(self, user_id: int, old_password: str, new_password: str) -> Dict:
        """
        修改用户密码
        
        Args:
            user_id (int): 用户ID
            old_password (str): 旧密码
            new_password (str): 新密码
            
        Returns:
            Dict: 修改结果
        """
        return self.db.change_password(user_id, old_password, new_password)
    
    def get_all_users(self, include_inactive: bool = False) -> list:
        """
        获取所有用户列表（管理员功能）
        
        Args:
            include_inactive (bool): 是否包含已停用的用户
            
        Returns:
            list: 用户列表
        """
        return self.db.get_all_users(include_inactive)
    
    def get_session_count(self) -> int:
        """获取当前活跃会话数量"""
        return len(self.active_sessions)
    
    def get_user_stats(self) -> Dict:
        """获取用户统计信息"""
        db_stats = self.db.get_user_count()
        db_stats["active_sessions"] = self.get_session_count()
        return db_stats

# 全局认证管理器实例
auth_manager = AuthManager()
