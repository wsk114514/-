// 聊天历史管理工具
// 负责保存、读取和管理用户的聊天历史记录

export class ChatHistoryManager {
  constructor() {
    this.storageKey = 'chat_histories';
    this.maxHistories = 50; // 最多保存50个历史会话
  }

  // 获取所有聊天历史
  getAllHistories() {
    try {
      const histories = localStorage.getItem(this.storageKey);
      return histories ? JSON.parse(histories) : [];
    } catch (error) {
      console.error('Failed to load chat histories:', error);
      return [];
    }
  }

  // 保存聊天会话
  saveChat(messages, functionType, title = null) {
    if (!messages || messages.length === 0) return null;

    const histories = this.getAllHistories();
    
    // 生成会话标题
    const sessionTitle = title || this.generateTitle(messages, functionType);
    
    // 创建新的历史记录
    const newHistory = {
      id: `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: sessionTitle,
      functionType: functionType,
      messages: messages.filter(msg => !msg.temp), // 排除临时消息
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messageCount: messages.filter(msg => !msg.temp).length
    };

    // 添加到历史记录开头
    histories.unshift(newHistory);

    // 限制历史记录数量
    if (histories.length > this.maxHistories) {
      histories.splice(this.maxHistories);
    }

    // 保存到本地存储
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(histories));
      return newHistory.id;
    } catch (error) {
      console.error('Failed to save chat history:', error);
      return null;
    }
  }

  // 更新现有聊天会话
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
        console.error('Failed to update chat history:', error);
        return false;
      }
    }
    return false;
  }

  // 获取特定聊天记录
  getChatById(chatId) {
    const histories = this.getAllHistories();
    return histories.find(h => h.id === chatId) || null;
  }

  // 删除聊天记录
  deleteChat(chatId) {
    const histories = this.getAllHistories();
    const filteredHistories = histories.filter(h => h.id !== chatId);
    
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(filteredHistories));
      return true;
    } catch (error) {
      console.error('Failed to delete chat history:', error);
      return false;
    }
  }

  // 清空所有历史记录
  clearAllHistories() {
    try {
      localStorage.removeItem(this.storageKey);
      return true;
    } catch (error) {
      console.error('Failed to clear chat histories:', error);
      return false;
    }
  }

  // 根据功能类型获取历史记录
  getHistoriesByFunction(functionType) {
    const histories = this.getAllHistories();
    return histories.filter(h => h.functionType === functionType);
  }

  // 搜索历史记录
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

  // 生成会话标题
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

  // 导出历史记录
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

  // 导入历史记录
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

// 创建全局实例
export const chatHistoryManager = new ChatHistoryManager();

// 便捷函数
export const saveChatHistory = (messages, functionType, title) => 
  chatHistoryManager.saveChat(messages, functionType, title);

export const loadChatHistory = (chatId) => 
  chatHistoryManager.getChatById(chatId);

export const getAllChatHistories = () => 
  chatHistoryManager.getAllHistories();

export const deleteChatHistory = (chatId) => 
  chatHistoryManager.deleteChat(chatId);
