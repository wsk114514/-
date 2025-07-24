"""
database.py - 用户数据库管理模块

这个模块负责：
1. 🗄️ 用户数据库的创建和管理
2. 👤 用户账号的注册、登录、信息管理
3. 🔒 密码的安全哈希存储
4. 📊 用户会话和活动记录
5. 🛡️ 数据库安全和事务管理

技术栈：
- SQLite: 轻量级关系数据库
- SQLAlchemy: Python ORM框架
- bcrypt: 密码哈希加密
- datetime: 时间戳管理

设计特色：
- 安全密码存储：使用bcrypt进行密码哈希
- 完整用户生命周期：注册、登录、更新、删除
- 会话管理：登录时间、最后活动时间记录
- 数据完整性：外键约束和事务支持
"""

import sqlite3
import hashlib
import secrets
import datetime
from typing import Optional, Dict, List
import logging
import os

# ========================= 日志配置 =========================
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ========================= 数据库配置 =========================
DB_PATH = "user_database.db"

class UserDatabase:
    """用户数据库管理类"""
    
    def __init__(self, db_path: str = DB_PATH):
        """
        初始化用户数据库
        
        Args:
            db_path (str): 数据库文件路径
        """
        self.db_path = db_path
        self.init_database()
    
    def _get_db_connection(self):
        """获取数据库连接"""
        return sqlite3.connect(self.db_path)
    
    def init_database(self):
        """初始化数据库表结构"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # 创建用户表
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS users (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        username VARCHAR(50) UNIQUE NOT NULL,
                        email VARCHAR(100) UNIQUE NOT NULL,
                        password_hash TEXT NOT NULL,
                        salt TEXT NOT NULL,
                        full_name VARCHAR(100),
                        avatar_url TEXT,
                        is_active BOOLEAN DEFAULT TRUE,
                        is_admin BOOLEAN DEFAULT FALSE,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        last_login TIMESTAMP,
                        login_count INTEGER DEFAULT 0
                    )
                ''')
                
                # 创建用户会话表
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS user_sessions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        session_token TEXT UNIQUE NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        expires_at TIMESTAMP NOT NULL,
                        is_active BOOLEAN DEFAULT TRUE,
                        ip_address TEXT,
                        user_agent TEXT,
                        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                    )
                ''')
                
                # 创建用户设置表
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS user_settings (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        setting_key VARCHAR(50) NOT NULL,
                        setting_value TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                        UNIQUE(user_id, setting_key)
                    )
                ''')
                
                # 创建索引提高查询性能
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id)')
                
                conn.commit()
                logger.info("用户数据库初始化成功")
                
        except Exception as e:
            logger.error(f"数据库初始化失败: {str(e)}")
            raise
    
    def _hash_password(self, password: str, salt: str = None) -> tuple:
        """
        生成密码哈希
        
        Args:
            password (str): 原始密码
            salt (str): 盐值，如果不提供则自动生成
            
        Returns:
            tuple: (password_hash, salt)
        """
        if salt is None:
            salt = secrets.token_hex(32)
        
        # 使用SHA-256和盐值进行哈希
        password_hash = hashlib.pbkdf2_hmac(
            'sha256', 
            password.encode('utf-8'), 
            salt.encode('utf-8'), 
            100000  # 迭代次数
        ).hex()
        
        return password_hash, salt
    
    def _verify_password(self, password: str, stored_hash: str, salt: str) -> bool:
        """
        验证密码
        
        Args:
            password (str): 输入的密码
            stored_hash (str): 存储的密码哈希
            salt (str): 盐值
            
        Returns:
            bool: 密码是否正确
        """
        password_hash, _ = self._hash_password(password, salt)
        return password_hash == stored_hash
    
    def create_user(self, username: str, email: str, password: str, 
                   full_name: str = None, avatar_url: str = None) -> Dict:
        """
        创建新用户
        
        Args:
            username (str): 用户名
            email (str): 邮箱
            password (str): 密码
            full_name (str): 全名（可选）
            avatar_url (str): 头像URL（可选）
            
        Returns:
            Dict: 创建结果 {"success": bool, "message": str, "user_id": int}
        """
        try:
            # 输入验证
            if not username or len(username) < 3:
                return {"success": False, "message": "用户名至少需要3个字符"}
            
            if not email or "@" not in email:
                return {"success": False, "message": "请输入有效的邮箱地址"}
            
            if not password or len(password) < 6:
                return {"success": False, "message": "密码至少需要6个字符"}
            
            # 生成密码哈希
            password_hash, salt = self._hash_password(password)
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # 检查用户名和邮箱是否已存在
                cursor.execute('SELECT id FROM users WHERE username = ? OR email = ?', 
                             (username, email))
                if cursor.fetchone():
                    return {"success": False, "message": "用户名或邮箱已存在"}
                
                # 插入新用户
                cursor.execute('''
                    INSERT INTO users (username, email, password_hash, salt, full_name, avatar_url)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (username, email, password_hash, salt, full_name, avatar_url))
                
                user_id = cursor.lastrowid
                conn.commit()
                
                logger.info(f"用户创建成功: {username} (ID: {user_id})")
                return {
                    "success": True, 
                    "message": "用户创建成功", 
                    "user_id": user_id
                }
                
        except sqlite3.IntegrityError as e:
            logger.error(f"用户创建失败 - 数据完整性错误: {str(e)}")
            return {"success": False, "message": "用户名或邮箱已存在"}
        except Exception as e:
            logger.error(f"用户创建失败: {str(e)}")
            return {"success": False, "message": "创建用户时发生错误"}
    
    def authenticate_user(self, username_or_email: str, password: str) -> Dict:
        """
        用户认证（登录）
        
        Args:
            username_or_email (str): 用户名或邮箱
            password (str): 密码
            
        Returns:
            Dict: 认证结果 {"success": bool, "message": str, "user": dict}
        """
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # 查找用户（支持用户名或邮箱登录）
                cursor.execute('''
                    SELECT id, username, email, password_hash, salt, full_name, 
                           avatar_url, is_active, is_admin, last_login, login_count
                    FROM users 
                    WHERE (username = ? OR email = ?) AND is_active = TRUE
                ''', (username_or_email, username_or_email))
                
                user = cursor.fetchone()
                if not user:
                    return {"success": False, "message": "用户不存在或已被禁用"}
                
                # 验证密码
                user_id, username, email, stored_hash, salt, full_name, avatar_url, is_active, is_admin, last_login, login_count = user
                
                if not self._verify_password(password, stored_hash, salt):
                    return {"success": False, "message": "密码错误"}
                
                # 更新登录信息
                cursor.execute('''
                    UPDATE users 
                    SET last_login = CURRENT_TIMESTAMP, login_count = login_count + 1,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', (user_id,))
                
                conn.commit()
                
                user_info = {
                    "id": user_id,
                    "username": username,
                    "email": email,
                    "full_name": full_name,
                    "avatar_url": avatar_url,
                    "is_admin": bool(is_admin),
                    "last_login": last_login,
                    "login_count": login_count + 1
                }
                
                logger.info(f"用户登录成功: {username} (ID: {user_id})")
                return {
                    "success": True, 
                    "message": "登录成功", 
                    "user": user_info
                }
                
        except Exception as e:
            logger.error(f"用户认证失败: {str(e)}")
            return {"success": False, "message": "登录时发生错误"}
    
    def get_user_by_id(self, user_id: int) -> Optional[Dict]:
        """
        根据ID获取用户信息
        
        Args:
            user_id (int): 用户ID
            
        Returns:
            Optional[Dict]: 用户信息或None
        """
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    SELECT id, username, email, full_name, avatar_url, 
                           is_active, is_admin, created_at, last_login, login_count
                    FROM users 
                    WHERE id = ?
                ''', (user_id,))
                
                user = cursor.fetchone()
                if user:
                    return {
                        "id": user[0],
                        "username": user[1],
                        "email": user[2],
                        "full_name": user[3],
                        "avatar_url": user[4],
                        "is_active": bool(user[5]),
                        "is_admin": bool(user[6]),
                        "created_at": user[7],
                        "last_login": user[8],
                        "login_count": user[9]
                    }
                return None
                
        except Exception as e:
            logger.error(f"获取用户信息失败: {str(e)}")
            return None
    
    def update_user(self, user_id: int, **kwargs) -> Dict:
        """
        更新用户信息
        
        Args:
            user_id (int): 用户ID
            **kwargs: 要更新的字段
            
        Returns:
            Dict: 更新结果
        """
        try:
            allowed_fields = ['username', 'email', 'full_name', 'avatar_url']
            update_fields = []
            update_values = []
            
            for field, value in kwargs.items():
                if field in allowed_fields and value is not None:
                    update_fields.append(f"{field} = ?")
                    update_values.append(value)
            
            if not update_fields:
                return {"success": False, "message": "没有要更新的字段"}
            
            update_values.append(user_id)
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                query = f'''
                    UPDATE users 
                    SET {', '.join(update_fields)}, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                '''
                
                cursor.execute(query, update_values)
                
                if cursor.rowcount == 0:
                    return {"success": False, "message": "用户不存在"}
                
                conn.commit()
                
                logger.info(f"用户信息更新成功: ID {user_id}")
                return {"success": True, "message": "用户信息更新成功"}
                
        except sqlite3.IntegrityError:
            return {"success": False, "message": "用户名或邮箱已存在"}
        except Exception as e:
            logger.error(f"更新用户信息失败: {str(e)}")
            return {"success": False, "message": "更新用户信息时发生错误"}
    
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
        try:
            if len(new_password) < 6:
                return {"success": False, "message": "新密码至少需要6个字符"}
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # 验证旧密码
                cursor.execute('SELECT password_hash, salt FROM users WHERE id = ?', (user_id,))
                user_data = cursor.fetchone()
                
                if not user_data:
                    return {"success": False, "message": "用户不存在"}
                
                stored_hash, salt = user_data
                if not self._verify_password(old_password, stored_hash, salt):
                    return {"success": False, "message": "旧密码错误"}
                
                # 生成新密码哈希
                new_hash, new_salt = self._hash_password(new_password)
                
                # 更新密码
                cursor.execute('''
                    UPDATE users 
                    SET password_hash = ?, salt = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', (new_hash, new_salt, user_id))
                
                conn.commit()
                
                logger.info(f"用户密码修改成功: ID {user_id}")
                return {"success": True, "message": "密码修改成功"}
                
        except Exception as e:
            logger.error(f"修改密码失败: {str(e)}")
            return {"success": False, "message": "修改密码时发生错误"}
    
    def deactivate_user(self, user_id: int) -> Dict:
        """
        停用用户账号
        
        Args:
            user_id (int): 用户ID
            
        Returns:
            Dict: 操作结果
        """
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    UPDATE users 
                    SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', (user_id,))
                
                if cursor.rowcount == 0:
                    return {"success": False, "message": "用户不存在"}
                
                conn.commit()
                
                logger.info(f"用户账号已停用: ID {user_id}")
                return {"success": True, "message": "用户账号已停用"}
                
        except Exception as e:
            logger.error(f"停用用户失败: {str(e)}")
            return {"success": False, "message": "停用用户时发生错误"}
    
    def get_all_users(self, include_inactive: bool = False) -> List[Dict]:
        """
        获取所有用户列表
        
        Args:
            include_inactive (bool): 是否包含已停用的用户
            
        Returns:
            List[Dict]: 用户列表
        """
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                if include_inactive:
                    query = '''
                        SELECT id, username, email, full_name, is_active, is_admin, 
                               created_at, last_login, login_count
                        FROM users 
                        ORDER BY created_at DESC
                    '''
                else:
                    query = '''
                        SELECT id, username, email, full_name, is_active, is_admin, 
                               created_at, last_login, login_count
                        FROM users 
                        WHERE is_active = TRUE
                        ORDER BY created_at DESC
                    '''
                
                cursor.execute(query)
                users = cursor.fetchall()
                
                user_list = []
                for user in users:
                    user_list.append({
                        "id": user[0],
                        "username": user[1],
                        "email": user[2],
                        "full_name": user[3],
                        "is_active": bool(user[4]),
                        "is_admin": bool(user[5]),
                        "created_at": user[6],
                        "last_login": user[7],
                        "login_count": user[8]
                    })
                
                return user_list
                
        except Exception as e:
            logger.error(f"获取用户列表失败: {str(e)}")
            return []
    
    def get_user_count(self) -> Dict:
        """
        获取用户统计信息
        
        Returns:
            Dict: 用户统计数据
        """
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('SELECT COUNT(*) FROM users WHERE is_active = TRUE')
                active_users = cursor.fetchone()[0]
                
                cursor.execute('SELECT COUNT(*) FROM users')
                total_users = cursor.fetchone()[0]
                
                cursor.execute('SELECT COUNT(*) FROM users WHERE is_admin = TRUE')
                admin_users = cursor.fetchone()[0]
                
                return {
                    "total_users": total_users,
                    "active_users": active_users,
                    "inactive_users": total_users - active_users,
                    "admin_users": admin_users
                }
                
        except Exception as e:
            logger.error(f"获取用户统计失败: {str(e)}")
            return {"total_users": 0, "active_users": 0, "inactive_users": 0, "admin_users": 0}

# ========================= 全局数据库实例 =========================
# 创建全局数据库实例
user_db = UserDatabase()

def get_user_database() -> UserDatabase:
    """获取用户数据库实例"""
    return user_db

# ========================= 便捷函数 =========================
def create_user(username: str, email: str, password: str, **kwargs) -> Dict:
    """创建用户的便捷函数"""
    return user_db.create_user(username, email, password, **kwargs)

def authenticate_user(username_or_email: str, password: str) -> Dict:
    """用户认证的便捷函数"""
    return user_db.authenticate_user(username_or_email, password)

def get_user_by_id(user_id: int) -> Optional[Dict]:
    """获取用户信息的便捷函数"""
    return user_db.get_user_by_id(user_id)
