/**
 * userSwitchEvents.js - 用户切换事件管理
 * 
 * 处理用户登录/退出时的状态清理，避免组件间循环依赖
 * 使用发布-订阅模式来协调不同Context间的状态清理
 */

class UserSwitchEventManager {
  constructor() {
    this.listeners = {
      'user-login': [],     // 用户登录事件
      'user-logout': [],    // 用户退出事件
      'user-switch': []     // 用户切换事件
    };
  }

  /**
   * 添加事件监听器
   * 
   * @param {string} event - 事件类型
   * @param {function} callback - 回调函数
   */
  addEventListener(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
      console.log(`✅ 已添加 ${event} 事件监听器`);
    }
  }

  /**
   * 移除事件监听器
   * 
   * @param {string} event - 事件类型
   * @param {function} callback - 回调函数
   */
  removeEventListener(event, callback) {
    if (this.listeners[event]) {
      const index = this.listeners[event].indexOf(callback);
      if (index > -1) {
        this.listeners[event].splice(index, 1);
        console.log(`✅ 已移除 ${event} 事件监听器`);
      }
    }
  }

  /**
   * 触发事件
   * 
   * @param {string} event - 事件类型
   * @param {any} data - 事件数据
   */
  emit(event, data = null) {
    if (this.listeners[event]) {
      console.log(`🎉 触发 ${event} 事件，监听器数量: ${this.listeners[event].length}`);
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ ${event} 事件监听器执行失败:`, error);
        }
      });
    }
  }

  /**
   * 用户登录事件
   * 
   * @param {object} userData - 用户数据
   */
  emitUserLogin(userData) {
    console.log(`👤 用户登录: ${userData?.username || '未知用户'}`);
    this.emit('user-login', userData);
    this.emit('user-switch', { type: 'login', user: userData });
  }

  /**
   * 用户退出事件
   * 
   * @param {object} userData - 用户数据
   */
  emitUserLogout(userData) {
    console.log(`👋 用户退出: ${userData?.username || '未知用户'}`);
    this.emit('user-logout', userData);
    this.emit('user-switch', { type: 'logout', user: userData });
  }
}

// 全局事件管理器实例
export const userSwitchEvents = new UserSwitchEventManager();

// 便捷函数
export const onUserLogin = (callback) => {
  userSwitchEvents.addEventListener('user-login', callback);
};

export const onUserLogout = (callback) => {
  userSwitchEvents.addEventListener('user-logout', callback);
};

export const onUserSwitch = (callback) => {
  userSwitchEvents.addEventListener('user-switch', callback);
};

export const emitUserLogin = (userData) => {
  userSwitchEvents.emitUserLogin(userData);
};

export const emitUserLogout = (userData) => {
  userSwitchEvents.emitUserLogout(userData);
};
