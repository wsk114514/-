// 用户会话管理工具
// 简单的用户ID管理，支持多用户并发

export class UserSessionManager {
  constructor() {
    this.currentUserId = this.getUserId();
  }

  // 获取或生成用户ID
  getUserId() {
    let userId = localStorage.getItem('user_session_id');
    if (!userId) {
      userId = this.generateUserId();
      localStorage.setItem('user_session_id', userId);
    }
    return userId;
  }

  // 生成唯一的用户ID
  generateUserId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `user_${timestamp}_${random}`;
  }

  // 设置用户ID（用于测试或特殊需求）
  setUserId(userId) {
    this.currentUserId = userId;
    localStorage.setItem('user_session_id', userId);
  }

  // 获取当前用户ID
  getCurrentUserId() {
    return this.currentUserId;
  }

  // 清除当前用户会话（相当于注销）
  clearSession() {
    localStorage.removeItem('user_session_id');
    this.currentUserId = this.generateUserId();
    localStorage.setItem('user_session_id', this.currentUserId);
  }

  // 获取会话信息
  getSessionInfo() {
    return {
      userId: this.currentUserId,
      sessionStart: localStorage.getItem('session_start') || new Date().toISOString()
    };
  }
}

// 创建全局实例
export const sessionManager = new UserSessionManager();

// 便捷函数
export const getCurrentUserId = () => sessionManager.getCurrentUserId();
export const clearUserSession = () => sessionManager.clearSession();
export const getSessionInfo = () => sessionManager.getSessionInfo();
