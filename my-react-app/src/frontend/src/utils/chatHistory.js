/**
 * chatHistory.js - 聊天历史管理工具模块
 * 
 * 这是前端聊天历史的核心管理工具，负责：
 * 1. 💾 本地存储管理 - 使用localStorage持久化聊天记录
 * 2. 📝 会话管理 - 创建、更新、删除聊天会话
 * 3. 🔍 历史记录检索 - 按时间、功能、标题搜索历史
 * 4. 📊 数据统计 - 会话数量、消息统计等
 * 5. 🏷️ 智能标题生成 - 根据对话内容自动生成会话标题
 * 6. 🧹 存储空间管理 - 限制记录数量，清理过期数据
 * 
 * 设计特色：
 * - 类型安全的数据结构
 * - 错误恢复和异常处理
 * - 性能优化的数据操作
 * - 用户友好的标题生成
 * 
 * 存储结构：
 * - 每个会话包含：ID、标题、功能类型、消息列表、时间戳
 * - 按创建时间倒序排列
 * - 支持增量更新和批量操作
 */

/**
 * 管理用户聊天历史记录的类。
 * 负责与 localStorage 交互，以持久化存储、检索和管理聊天会话。
 */
export class ChatHistoryManager {
  /**
   * 聊天历史管理器构造函数
   * 
   * 初始化配置和存储参数：
   * - 基于用户ID的独立存储键名
   * - 最大保存数量限制
   * - 数据格式版本控制
   * 
   * @param {string|null} [userId=null] - 用户ID，用于创建独立的聊天记录存储。如果为null，则为游客模式。
   */
  constructor(userId = null) {
    this.userId = userId;
    // 基于用户ID创建独立的存储键，未登录用户使用默认键
    this.storageKey = userId ? `chat_histories_${userId}` : 'chat_histories_guest';
    this.maxHistories = 50;                // 最多保存50个历史会话，防止存储空间过大
  }

  /**
   * 更新用户ID并重新设置存储键。
   * 用于用户登录/退出时切换聊天记录存储。
   * 
   * @param {string|null} userId - 新的用户ID。
   */
  setUserId(userId) {
    this.userId = userId;
    this.storageKey = userId ? `chat_histories_${userId}` : 'chat_histories_guest';
  }

  /**
   * 获取所有聊天历史。
   * 
   * 功能说明：
   * - 从localStorage读取所有聊天历史记录。
   * - 自动处理JSON解析错误。
   * - 返回按时间倒序排列的历史列表。
   * 
   * @returns {Array<Object>} 聊天历史记录数组，按创建时间倒序。
   */
  getAllHistories() {
    try {
      const histories = localStorage.getItem(this.storageKey);
      return histories ? JSON.parse(histories) : [];
    } catch (error) {
      console.error('加载聊天历史失败:', error);
      return [];
    }
  }

  /**
   * 保存聊天会话。
   * 
   * 功能说明：
   * - 将当前对话保存为历史记录。
   * - 自动生成会话标题。
   * - 过滤临时消息（如加载状态）。
   * - 维护存储数量限制。
   * 
   * @param {Array<Object>} messages - 消息列表。
   * @param {string} functionType - 功能类型。
   * @param {string|null} [title=null] - 自定义标题，为空时自动生成。
   * @returns {string|null} 保存成功返回会话ID，失败返回null。
   */
  saveChat(messages, functionType, title = null) {
    // 验证输入参数
    if (!messages || messages.length === 0) return null;

    const histories = this.getAllHistories();
    
    // 生成会话标题 - 自动或自定义
    const sessionTitle = title || this.generateTitle(messages, functionType);
    
    // 创建新的历史记录对象
    const newHistory = {
      id: `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,  // 唯一ID
      title: sessionTitle,                   // 会话标题
      functionType: functionType,            // 功能类型
      messages: messages.filter(msg => !msg.temp),  // 排除临时消息（如"正在思考..."）
      createdAt: new Date().toISOString(),   // 创建时间
      updatedAt: new Date().toISOString(),   // 更新时间
      messageCount: messages.filter(msg => !msg.temp).length  // 有效消息数量
    };

    // 添加到历史记录开头（最新的在前面）
    histories.unshift(newHistory);

    // 限制历史记录数量，删除最旧的记录
    if (histories.length > this.maxHistories) {
      histories.splice(this.maxHistories);
    }

    // 保存到本地存储
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(histories));
      return newHistory.id;
    } catch (error) {
      console.error('保存聊天历史失败:', error);
      return null;
    }
  }

  /**
   * 更新现有聊天会话。
   * 
   * 功能说明：
   * - 更新指定ID的聊天会话内容。
   * - 支持更新消息列表和标题。
   * - 自动更新时间戳。
   * 
   * @param {string} chatId - 要更新的会话ID。
   * @param {Array<Object>} messages - 新的消息列表。
   * @param {string|null} [title=null] - 新标题，为空则保持原标题。
   * @returns {boolean} 更新成功返回true，失败返回false。
   */
  updateChat(chatId, messages, title = null) {
    const histories = this.getAllHistories();
    const index = histories.findIndex(h => h.id === chatId);
    
    if (index !== -1) {
      histories[index].messages = messages.filter(msg => !msg.temp);
      histories[index].updatedAt = new Date().toISOString();
      histories[index].messageCount = messages.filter(msg => !msg.temp).length;
      
      if (title) {
        histories[index].title = title;
      }

      try {
        localStorage.setItem(this.storageKey, JSON.stringify(histories));
        return true;
      } catch (error) {
        console.error('更新聊天历史失败:', error);
        return false;
      }
    }
    return false;
  }

  /**
   * 通过ID获取单个聊天记录。
   * @param {string} chatId - 要检索的会话ID。
   * @returns {Object|null} 找到的会话对象，如果未找到则返回null。
   */
  getChatById(chatId) {
    const histories = this.getAllHistories();
    return histories.find(h => h.id === chatId) || null;
  }

  /**
   * 通过ID删除一个聊天记录。
   * @param {string} chatId - 要删除的会话ID。
   * @returns {boolean} 删除成功返回true，失败返回false。
   */
  deleteChat(chatId) {
    const histories = this.getAllHistories();
    const filteredHistories = histories.filter(h => h.id !== chatId);
    
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(filteredHistories));
      return true;
    } catch (error) {
      console.error('删除聊天历史失败:', error);
      return false;
    }
  }

  /**
   * 清空当前用户的所有历史记录。
   * @returns {boolean} 清空成功返回true，失败返回false。
   */
  clearAllHistories() {
    try {
      localStorage.removeItem(this.storageKey);
      return true;
    } catch (error) {
      console.error('清空聊天历史失败:', error);
      return false;
    }
  }

  /**
   * 根据功能类型筛选历史记录。
   * @param {string} functionType - 要筛选的功能类型。
   * @returns {Array<Object>} 匹配该功能类型的历史记录数组。
   */
  getHistoriesByFunction(functionType) {
    const histories = this.getAllHistories();
    return histories.filter(h => h.functionType === functionType);
  }

  /**
   * 在所有历史记录的标题和消息内容中搜索关键字。
   * @param {string} keyword - 要搜索的关键字。
   * @returns {Array<Object>} 包含关键字的历史记录数组。
   */
  searchHistories(keyword) {
    const histories = this.getAllHistories();
    const lowerKeyword = keyword.toLowerCase();
    
    return histories.filter(history => 
      history.title.toLowerCase().includes(lowerKeyword) ||
      history.messages.some(msg => 
        msg.content.toLowerCase().includes(lowerKeyword)
      )
    );
  }

  /**
   * 根据消息内容和功能类型智能生成会话标题。
   * @param {Array<Object>} messages - 消息列表。
   * @param {string} functionType - 功能类型。
   * @returns {string} 生成的会话标题。
   */
  generateTitle(messages, functionType) {
    // 获取第一条用户消息作为标题基础
    const firstUserMessage = messages.find(msg => msg.isUser && !msg.temp);
    
    if (firstUserMessage) {
      // 截取前30个字符作为标题
      let title = firstUserMessage.content.substring(0, 30);
      if (firstUserMessage.content.length > 30) {
        title += '...';
      }
      return title;
    }

    // 如果没有用户消息，使用功能类型和时间
    const functionNames = {
      general: '通用对话',
      play: '游戏推荐',
      game_guide: '游戏攻略',
      doc_qa: '文档问答',
      game_wiki: '游戏百科'
    };

    const functionName = functionNames[functionType] || '对话';
    const time = new Date().toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    return `${functionName} - ${time}`;
  }

  /**
   * 将当前用户的所有历史记录导出为JSON文件。
   */
  exportHistories() {
    const histories = this.getAllHistories();
    const dataStr = JSON.stringify(histories, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chat_histories_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  }

  /**
   * 从JSON文件导入历史记录，并与现有记录合并。
   * @param {File} file - 用户选择的JSON文件。
   * @returns {Promise<number>} 成功时，Promise解析为合并后的总历史记录数。
   */
  importHistories(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const importedHistories = JSON.parse(e.target.result);
          const currentHistories = this.getAllHistories();
          
          // 合并历史记录，避免重复
          const mergedHistories = [...currentHistories];
          
          importedHistories.forEach(imported => {
            if (!mergedHistories.find(h => h.id === imported.id)) {
              mergedHistories.push(imported);
            }
          });

          // 按时间排序并限制数量
          mergedHistories.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          mergedHistories.splice(this.maxHistories);

          localStorage.setItem(this.storageKey, JSON.stringify(mergedHistories));
          resolve(mergedHistories.length);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsText(file);
    });
  }
}

// ========================= 全局实例管理 =========================

// 存储当前用户的聊天记录管理器实例
let currentChatHistoryManager = null;
let currentUserId = null;

/**
 * 获取或创建聊天记录管理器实例。
 * 采用单例模式，确保每个用户ID只对应一个管理器实例。
 * 
 * @param {string|null} [userId=null] - 用户ID。
 * @returns {ChatHistoryManager} 聊天记录管理器实例。
 */
export const getChatHistoryManager = (userId = null) => {
  // 如果用户ID发生变化，或者还没有实例，就创建新的
  if (!currentChatHistoryManager || currentUserId !== userId) {
    currentChatHistoryManager = new ChatHistoryManager(userId);
    currentUserId = userId;
    console.log(`🔄 切换聊天记录管理器 - 用户: ${userId || '游客'}`);
  }
  return currentChatHistoryManager;
};

/**
 * 清理当前的聊天记录管理器实例。
 * 通常在用户登出或切换账户时调用。
 */
export const clearChatHistoryManager = () => {
  currentChatHistoryManager = null;
  currentUserId = null;
  console.log('🧹 已清理聊天记录管理器');
};

/**
 * @deprecated 为了向后兼容，保留全局实例（游客模式）。推荐使用 getChatHistoryManager()。
 */
export const chatHistoryManager = getChatHistoryManager();

// ========================= 便捷函数 =========================

/**
 * 便捷函数：保存一条聊天记录。
 * @param {Array<Object>} messages - 消息列表。
 * @param {string} functionType - 功能类型。
 * @param {string|null} title - 会话标题。
 * @param {string|null} [userId=null] - 用户ID。
 * @returns {string|null} 保存成功返回会话ID，否则返回null。
 */
export const saveChatHistory = (messages, functionType, title, userId = null) => {
  const manager = getChatHistoryManager(userId);
  return manager.saveChat(messages, functionType, title);
};

/**
 * 便捷函数：通过ID加载一条聊天记录。
 * @param {string} chatId - 会话ID。
 * @param {string|null} [userId=null] - 用户ID。
 * @returns {Object|null} 找到的会话对象，否则返回null。
 */
export const loadChatHistory = (chatId, userId = null) => {
  const manager = getChatHistoryManager(userId);
  return manager.getChatById(chatId);
};

/**
 * 便捷函数：获取当前用户的所有聊天记录。
 * @param {string|null} [userId=null] - 用户ID。
 * @returns {Array<Object>} 聊天历史记录数组。
 */
export const getAllChatHistories = (userId = null) => {
  const manager = getChatHistoryManager(userId);
  return manager.getAllHistories();
};

/**
 * 便捷函数：通过ID删除一条聊天记录。
 * @param {string} chatId - 会话ID。
 * @param {string|null} [userId=null] - 用户ID。
 * @returns {boolean} 删除成功返回true，否则返回false。
 */
export const deleteChatHistory = (chatId, userId = null) => {
  const manager = getChatHistoryManager(userId);
  return manager.deleteChat(chatId);
};
