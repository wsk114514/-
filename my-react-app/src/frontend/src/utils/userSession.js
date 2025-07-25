/**
 * userSession.js - 用户会话管理工具
 * 
 * 负责处理与用户会话相关的所有逻辑，包括：
 * 1. 🆔 用户ID的生成、获取和管理
 * 2. 💾 会话信息在localStorage中的持久化
 * 3. 🔄 会话的创建、清理和重置
 * 4. 📦 提供便捷的全局函数供其他模块调用
 * 
 * 设计思路：
 * - 使用localStorage实现跨页面的会话保持
 * - 通过一个单例的UserSessionManager类来集中管理会话逻辑
 * - 提供简单易用的接口函数，隐藏底层实现细节
 */

/**
 * 用户会话管理类
 * 封装了所有与用户会话相关的操作
 */
export class UserSessionManager {
  /**
   * 构造函数，在实例化时自动获取或创建用户ID
   */
  constructor() {
    this.currentUserId = this.getUserId();
  }

  /**
   * 从localStorage获取用户ID，如果不存在则生成一个新的
   * @returns {string} 当前用户的唯一标识符
   */
  getUserId() {
    let userId = localStorage.getItem('user_session_id');
    if (!userId) {
      userId = this.generateUserId();
      localStorage.setItem('user_session_id', userId);
    }
    return userId;
  }

  /**
   * 生成一个基于时间戳和随机数的唯一用户ID
   * @returns {string} 格式为 'user_timestamp_random' 的字符串
   */
  generateUserId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `user_${timestamp}_${random}`;
  }

  /**
   * 强制设置当前的用户ID（主要用于测试或特殊场景）
   * @param {string} userId - 要设置的用户ID
   */
  setUserId(userId) {
    this.currentUserId = userId;
    localStorage.setItem('user_session_id', userId);
  }

  /**
   * 获取当前用户的ID
   * @returns {string} 当前用户的唯一标识符
   */
  getCurrentUserId() {
    return this.currentUserId;
  }

  /**
   * 清除当前用户的会话信息并生成一个新的会话
   * 这通常在用户登出或需要重置会话状态时调用
   */
  clearSession() {
    localStorage.removeItem('user_session_id');
    this.currentUserId = this.generateUserId();
    localStorage.setItem('user_session_id', this.currentUserId);
  }

  /**
   * 获取当前会话的详细信息
   * @returns {{userId: string, sessionStart: string}} 包含用户ID和会话开始时间的对象
   */
  getSessionInfo() {
    return {
      userId: this.currentUserId,
      sessionStart: localStorage.getItem('session_start') || new Date().toISOString()
    };
  }
}

/**
 * 全局唯一的会话管理器实例
 * @type {UserSessionManager}
 */
export const sessionManager = new UserSessionManager();

// ========================= 便捷函数 =========================

/**
 * 便捷函数：获取当前用户的ID
 * @returns {string} 当前用户的唯一标识符
 */
export const getCurrentUserId = () => sessionManager.getCurrentUserId();

/**
 * 便捷函数：清除当前用户的会话
 */
export const clearUserSession = () => sessionManager.clearSession();

/**
 * 便捷函数：获取当前会话的信息
 * @returns {{userId: string, sessionStart: string}} 包含用户ID和会话开始时间的对象
 */
export const getSessionInfo = () => sessionManager.getSessionInfo();
