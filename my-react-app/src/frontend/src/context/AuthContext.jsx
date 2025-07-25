/**
 * AuthContext.jsx - 用户认证状态管理
 * 
 * 负责用户登录状态管理、会话保持和认证相关的全局状态
 * 在用户切换时自动清理聊天状态，确保用户隔离
 */

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { clearChatHistoryManager } from '../utils/chatHistory';
import { clearGameCollectionManager } from '../utils/gameCollection';
import { emitUserLogin, emitUserLogout } from '../utils/userSwitchEvents';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 存储键名常量
  const STORAGE_KEYS = {
    AUTH: 'isAuthenticated',
    USER: 'user'
  };

  // 安全的 localStorage 操作
  const safeLocalStorage = {
    getItem: (key) => {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        console.error('读取 localStorage 失败:', error);
        return null;
      }
    },
    setItem: (key, value) => {
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        console.error('写入 localStorage 失败:', error);
      }
    },
    removeItem: (key) => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error('删除 localStorage 失败:', error);
      }
    }
  };

  // 初始化认证状态
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const storedAuth = safeLocalStorage.getItem(STORAGE_KEYS.AUTH);
        const storedUser = safeLocalStorage.getItem(STORAGE_KEYS.USER);
        
        if (storedAuth === 'true' && storedUser) {
          const userData = JSON.parse(storedUser);
          setIsAuthenticated(true);
          setUser(userData);
        }
      } catch (error) {
        console.error('初始化认证状态失败:', error);
        // 清除可能损坏的数据
        safeLocalStorage.removeItem(STORAGE_KEYS.AUTH);
        safeLocalStorage.removeItem(STORAGE_KEYS.USER);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // 登录函数
  const login = useCallback((userData) => {
    if (!userData || !userData.username) {
      console.error('无效的用户数据');
      return false;
    }

    try {
      // 清理当前的聊天记录管理器以切换到新用户
      clearChatHistoryManager();
      // 清理当前的游戏收藏管理器以切换到新用户
      clearGameCollectionManager();
      
      setIsAuthenticated(true);
      setUser(userData);
      
      // 保存到 localStorage
      safeLocalStorage.setItem(STORAGE_KEYS.AUTH, 'true');
      safeLocalStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
      
      // 触发用户登录事件，通知其他组件清理状态
      emitUserLogin(userData);
      
      console.log(`✅ 用户 ${userData.username} 登录成功`);
      return true;
    } catch (error) {
      console.error('登录失败:', error);
      return false;
    }
  }, []);

  // 登出函数
  const logout = useCallback(() => {
    try {
      const currentUser = user;
      const username = currentUser?.username || '未知用户';
      
      // 清理聊天记录管理器，切换回游客模式
      clearChatHistoryManager();
      // 清理游戏收藏管理器，切换回游客模式
      clearGameCollectionManager();
      
      setIsAuthenticated(false);
      setUser(null);
      
      // 清除 localStorage
      safeLocalStorage.removeItem(STORAGE_KEYS.AUTH);
      safeLocalStorage.removeItem(STORAGE_KEYS.USER);
      
      // 触发用户退出事件，通知其他组件清理状态
      emitUserLogout(currentUser);
      
      console.log(`👋 用户 ${username} 已退出登录`);
    } catch (error) {
      console.error('登出失败:', error);
    }
  }, [user]);

  // 更新用户信息
  const updateUser = useCallback((newUserData) => {
    if (!newUserData || !isAuthenticated) {
      return false;
    }

    try {
      const updatedUser = { ...user, ...newUserData };
      setUser(updatedUser);
      safeLocalStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
      return true;
    } catch (error) {
      console.error('更新用户信息失败:', error);
      return false;
    }
  }, [user, isAuthenticated]);

  // 检查用户是否有特定权限
  const hasPermission = useCallback((permission) => {
    if (!user || !user.permissions) {
      return false;
    }
    return user.permissions.includes(permission);
  }, [user]);

  const contextValue = {
    // 状态
    isAuthenticated,
    user,
    loading,
    
    // 操作方法
    login,
    logout,
    updateUser,
    hasPermission
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};