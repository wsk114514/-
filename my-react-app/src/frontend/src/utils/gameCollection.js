/**
 * gameCollection.js - 游戏收藏管理工具
 * 
 * 提供游戏收藏的本地存储和管理功能：
 * 1. 📚 收藏游戏添加/删除（支持用户隔离）
 * 2. 📋 收藏列表查看和管理
 * 3. 🔍 收藏游戏搜索和过滤
 * 4. 💾 本地存储持久化（按用户独立存储）
 * 5. 🏷️ 游戏分类和标签管理
 * 6. 👤 用户独立收藏系统
 */

// ========================= 存储键常量 =========================
const STORAGE_KEYS = {
  GAME_COLLECTION: 'game_collection',      // 全局收藏（向后兼容）
  COLLECTION_SETTINGS: 'collection_settings'
};

/**
 * 获取用户特定的存储键
 * 
 * @param {string|null} userId - 用户ID，null表示游客
 * @returns {object} 用户特定的存储键对象
 */
const getUserStorageKeys = (userId = null) => {
  const userSuffix = userId ? `_${userId}` : '_guest';
  return {
    GAME_COLLECTION: `game_collection${userSuffix}`,
    COLLECTION_SETTINGS: `collection_settings${userSuffix}`
  };
};

// ========================= 游戏收藏数据结构 =========================
/**
 * 游戏收藏项数据结构
 * @typedef {Object} GameItem
 * @property {string} id - 游戏唯一标识
 * @property {string} name - 游戏名称
 * @property {string} description - 游戏描述
 * @property {string[]} genres - 游戏类型标签
 * @property {string} platform - 游戏平台
 * @property {string} releaseDate - 发布日期
 * @property {number} rating - 评分 (1-10)
 * @property {string} coverImage - 封面图片URL
 * @property {string} addedDate - 添加到收藏的日期
 * @property {string} source - 来源（AI推荐、手动添加等）
 * @property {string} notes - 用户备注
 * @property {boolean} isPlayed - 是否已游玩
 * @property {string} playStatus - 游玩状态：想玩/在玩/已玩/已通关
 */

// ========================= 收藏管理类 =========================
class GameCollectionManager {
  constructor(userId = null) {
    this.userId = userId;
    this.storageKeys = getUserStorageKeys(userId);
    
    // 初始化收藏列表
    this.collection = this.loadCollection();
    // 确保 collection 始终是数组
    if (!Array.isArray(this.collection)) {
      console.warn(`收藏列表初始化失败，当前类型: ${typeof this.collection}，已重置为空数组`);
      this.collection = [];
    }
    
    this.settings = this.loadSettings();
    
    console.log(`🎮 游戏收藏管理器已初始化 - 用户: ${userId || '游客'}, 收藏数量: ${this.collection.length}`);
  }

  /**
   * 更新用户ID并重新加载数据
   * 
   * @param {string|null} userId - 新的用户ID
   */
  setUserId(userId) {
    this.userId = userId;
    this.storageKeys = getUserStorageKeys(userId);
    
    // 重新加载收藏列表
    this.collection = this.loadCollection();
    // 确保 collection 始终是数组
    if (!Array.isArray(this.collection)) {
      console.warn(`用户切换后收藏列表加载失败，当前类型: ${typeof this.collection}，已重置为空数组`);
      this.collection = [];
    }
    
    this.settings = this.loadSettings();
    console.log(`🔄 切换游戏收藏管理器 - 用户: ${userId || '游客'}, 收藏数量: ${this.collection.length}`);
  }

  /**
   * 从本地存储加载收藏列表
   */
  loadCollection() {
    try {
      const stored = localStorage.getItem(this.storageKeys.GAME_COLLECTION);
      if (!stored) {
        return [];
      }
      
      const parsed = JSON.parse(stored);
      // 确保返回的总是一个数组
      if (!Array.isArray(parsed)) {
        console.warn('本地存储的收藏数据不是数组格式，已重置为空数组');
        return [];
      }
      
      return parsed;
    } catch (error) {
      console.error('加载游戏收藏列表失败:', error);
      return [];
    }
  }

  /**
   * 保存收藏列表到本地存储
   */
  saveCollection() {
    try {
      // 确保只保存有效的数组数据
      if (!Array.isArray(this.collection)) {
        console.error('尝试保存非数组类型的收藏数据，已重置为空数组');
        this.collection = [];
      }
      
      localStorage.setItem(this.storageKeys.GAME_COLLECTION, JSON.stringify(this.collection));
      return true;
    } catch (error) {
      console.error('保存游戏收藏列表失败:', error);
      return false;
    }
  }

  /**
   * 加载收藏设置
   */
  loadSettings() {
    try {
      const stored = localStorage.getItem(this.storageKeys.COLLECTION_SETTINGS);
      return stored ? JSON.parse(stored) : {
        sortBy: 'addedDate', // 排序方式
        sortOrder: 'desc',   // 排序顺序
        viewMode: 'grid',    // 显示模式：grid/list
        filterBy: 'all'      // 过滤条件
      };
    } catch (error) {
      console.error('加载收藏设置失败:', error);
      return { sortBy: 'addedDate', sortOrder: 'desc', viewMode: 'grid', filterBy: 'all' };
    }
  }

  /**
   * 保存收藏设置
   */
  saveSettings() {
    try {
      localStorage.setItem(this.storageKeys.COLLECTION_SETTINGS, JSON.stringify(this.settings));
      return true;
    } catch (error) {
      console.error('保存收藏设置失败:', error);
      return false;
    }
  }

  /**
   * 添加游戏到收藏
   * @param {Object} gameData - 游戏数据
   * @returns {Object} 结果对象
   */
  addGame(gameData) {
    try {
      // 生成唯一ID
      const gameId = this.generateGameId(gameData.name);
      
      // 检查是否已存在
      if (this.isGameCollected(gameId)) {
        return {
          success: false,
          message: '该游戏已在收藏列表中',
          gameId
        };
      }

      // 创建游戏收藏项
      const gameItem = {
        id: gameId,
        name: gameData.name || '未知游戏',
        description: gameData.description || '',
        genres: gameData.genres || [],
        platform: gameData.platform || '',
        releaseDate: gameData.releaseDate || '',
        rating: gameData.rating || 0,
        coverImage: gameData.coverImage || '',
        addedDate: new Date().toISOString(),
        source: gameData.source || 'manual',
        notes: gameData.notes || '',
        isPlayed: false,
        playStatus: 'want_to_play'
      };

      // 添加到收藏列表
      this.collection.unshift(gameItem); // 添加到列表开头
      
      // 保存到本地存储
      if (this.saveCollection()) {
        return {
          success: true,
          message: '游戏已添加到收藏列表',
          gameId,
          gameItem
        };
      } else {
        // 保存失败，回滚
        this.collection.shift();
        return {
          success: false,
          message: '保存失败，请重试',
          gameId
        };
      }
    } catch (error) {
      console.error('添加游戏到收藏失败:', error);
      return {
        success: false,
        message: '添加失败，请重试',
        error: error.message
      };
    }
  }

  /**
   * 从收藏中移除游戏
   * @param {string} gameId - 游戏ID
   * @returns {Object} 结果对象
   */
  removeGame(gameId) {
    try {
      const index = this.collection.findIndex(game => game.id === gameId);
      if (index === -1) {
        return {
          success: false,
          message: '游戏不在收藏列表中'
        };
      }

      const removedGame = this.collection.splice(index, 1)[0];
      
      if (this.saveCollection()) {
        return {
          success: true,
          message: '游戏已从收藏列表移除',
          removedGame
        };
      } else {
        // 保存失败，回滚
        this.collection.splice(index, 0, removedGame);
        return {
          success: false,
          message: '移除失败，请重试'
        };
      }
    } catch (error) {
      console.error('移除游戏失败:', error);
      return {
        success: false,
        message: '移除失败，请重试',
        error: error.message
      };
    }
  }

  /**
   * 更新游戏信息
   * @param {string} gameId - 游戏ID
   * @param {Object} updates - 更新数据
   * @returns {Object} 结果对象
   */
  updateGame(gameId, updates) {
    try {
      const index = this.collection.findIndex(game => game.id === gameId);
      if (index === -1) {
        return {
          success: false,
          message: '游戏不在收藏列表中'
        };
      }

      const originalGame = { ...this.collection[index] };
      this.collection[index] = { ...this.collection[index], ...updates };
      
      if (this.saveCollection()) {
        return {
          success: true,
          message: '游戏信息已更新',
          updatedGame: this.collection[index]
        };
      } else {
        // 保存失败，回滚
        this.collection[index] = originalGame;
        return {
          success: false,
          message: '更新失败，请重试'
        };
      }
    } catch (error) {
      console.error('更新游戏信息失败:', error);
      return {
        success: false,
        message: '更新失败，请重试',
        error: error.message
      };
    }
  }

  /**
   * 检查游戏是否已收藏
   * @param {string} gameId - 游戏ID
   * @returns {boolean}
   */
  isGameCollected(gameId) {
    if (!Array.isArray(this.collection)) {
      this.collection = [];
    }
    return this.collection.some(game => game.id === gameId);
  }

  /**
   * 根据游戏名检查是否已收藏
   * @param {string} gameName - 游戏名称
   * @returns {boolean}
   */
  isGameCollectedByName(gameName) {
    const gameId = this.generateGameId(gameName);
    return this.isGameCollected(gameId);
  }

  /**
   * 获取收藏列表
   * @param {Object} options - 查询选项
   * @returns {Array} 游戏列表
   */
  getCollection(options = {}) {
    // 确保 collection 不为 null 或 undefined，并且是数组
    if (!this.collection || !Array.isArray(this.collection)) {
      this.collection = [];
    }
    
    // 再次确保安全复制
    let result;
    try {
      result = Array.isArray(this.collection) ? [...this.collection] : [];
    } catch (error) {
      console.error('复制收藏列表失败:', error);
      this.collection = [];
      result = [];
    }

    // 应用过滤器
    if (options.filter) {
      result = this.applyFilters(result, options.filter);
    }

    // 应用搜索
    if (options.search) {
      result = this.applySearch(result, options.search);
    }

    // 应用排序
    if (options.sortBy) {
      result = this.applySorting(result, options.sortBy, options.sortOrder);
    }

    return result;
  }

  /**
   * 应用过滤器
   * @param {Array} games - 游戏列表
   * @param {Object} filter - 过滤条件
   * @returns {Array} 过滤后的列表
   */
  applyFilters(games, filter) {
    if (!Array.isArray(games)) return [];
    return games.filter(game => {
      // 按游玩状态过滤
      if (filter.playStatus && filter.playStatus !== 'all') {
        if (game.playStatus !== filter.playStatus) return false;
      }

      // 按游戏类型过滤
      if (filter.genre && filter.genre !== 'all') {
        if (!game.genres.includes(filter.genre)) return false;
      }

      // 按平台过滤
      if (filter.platform && filter.platform !== 'all') {
        if (game.platform !== filter.platform) return false;
      }

      // 按评分过滤
      if (filter.minRating) {
        if (game.rating < filter.minRating) return false;
      }

      return true;
    });
  }

  /**
   * 应用搜索
   * @param {Array} games - 游戏列表
   * @param {string} searchTerm - 搜索词
   * @returns {Array} 搜索结果
   */
  applySearch(games, searchTerm) {
    if (!Array.isArray(games)) return [];
    const term = searchTerm.toLowerCase().trim();
    if (!term) return games;

    return games.filter(game => 
      game.name.toLowerCase().includes(term) ||
      game.description.toLowerCase().includes(term) ||
      game.genres.some(genre => genre.toLowerCase().includes(term)) ||
      game.platform.toLowerCase().includes(term) ||
      game.notes.toLowerCase().includes(term)
    );
  }

  /**
   * 应用排序
   * @param {Array} games - 游戏列表
   * @param {string} sortBy - 排序字段
   * @param {string} sortOrder - 排序顺序
   * @returns {Array} 排序后的列表
   */
  applySorting(games, sortBy, sortOrder = 'desc') {
    if (!Array.isArray(games)) return [];
    return games.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      // 处理日期类型
      if (sortBy === 'addedDate' || sortBy === 'releaseDate') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      // 处理字符串类型
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      let result = 0;
      if (aValue < bValue) result = -1;
      else if (aValue > bValue) result = 1;

      return sortOrder === 'desc' ? -result : result;
    });
  }

  /**
   * 生成游戏ID
   * @param {string} gameName - 游戏名称
   * @returns {string} 游戏ID
   */
  generateGameId(gameName) {
    return gameName.toLowerCase()
      .replace(/[^\w\s-]/g, '') // 移除特殊字符
      .replace(/\s+/g, '-')     // 替换空格为连字符
      .replace(/-+/g, '-')      // 合并多个连字符
      .replace(/^-|-$/g, '');   // 移除首尾连字符
  }

  /**
   * 获取收藏统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    if (!Array.isArray(this.collection)) {
      this.collection = [];
    }
    const total = this.collection.length;
    const byStatus = this.collection.reduce((acc, game) => {
      acc[game.playStatus] = (acc[game.playStatus] || 0) + 1;
      return acc;
    }, {});

    const byGenre = this.collection.reduce((acc, game) => {
      game.genres.forEach(genre => {
        acc[genre] = (acc[genre] || 0) + 1;
      });
      return acc;
    }, {});

    return {
      total,
      byStatus,
      byGenre,
      averageRating: total > 0 ? this.collection.reduce((sum, game) => sum + game.rating, 0) / total : 0
    };
  }

  /**
   * 清空收藏列表
   * @returns {Object} 结果对象
   */
  clearCollection() {
    try {
      const backupCollection = [...this.collection];
      this.collection = [];
      
      if (this.saveCollection()) {
        return {
          success: true,
          message: '收藏列表已清空',
          clearedCount: backupCollection.length
        };
      } else {
        // 保存失败，回滚
        this.collection = backupCollection;
        return {
          success: false,
          message: '清空失败，请重试'
        };
      }
    } catch (error) {
      console.error('清空收藏列表失败:', error);
      return {
        success: false,
        message: '清空失败，请重试',
        error: error.message
      };
    }
  }

  /**
   * 导出收藏列表
   * @param {string} format - 导出格式 ('json' | 'csv')
   * @returns {string} 导出数据
   */
  exportCollection(format = 'json') {
    try {
      if (format === 'json') {
        return JSON.stringify(this.collection, null, 2);
      } else if (format === 'csv') {
        const headers = ['游戏名称', '描述', '类型', '平台', '发布日期', '评分', '游玩状态', '添加日期', '备注'];
        const rows = this.collection.map(game => [
          game.name,
          game.description,
          game.genres.join(';'),
          game.platform,
          game.releaseDate,
          game.rating,
          game.playStatus,
          game.addedDate,
          game.notes
        ]);
        
        return [headers, ...rows].map(row => 
          row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
        ).join('\n');
      }
    } catch (error) {
      console.error('导出收藏列表失败:', error);
      throw error;
    }
  }
}

// ========================= 全局实例管理 =========================

// 存储当前用户的游戏收藏管理器实例
let currentGameCollectionManager = null;
let currentUserId = null;

/**
 * 获取或创建游戏收藏管理器实例
 * 
 * @param {string|null} userId - 用户ID
 * @returns {GameCollectionManager} 游戏收藏管理器实例
 */
export const getGameCollectionManager = (userId = null) => {
  try {
    // 如果用户ID发生变化，或者还没有实例，就创建新的
    if (!currentGameCollectionManager || currentUserId !== userId) {
      currentGameCollectionManager = new GameCollectionManager(userId);
      currentUserId = userId;
      console.log(`🔄 切换游戏收藏管理器 - 用户: ${userId || '游客'}`);
    }
    return currentGameCollectionManager;
  } catch (error) {
    console.error('获取游戏收藏管理器失败:', error);
    // 如果出错，创建一个基本的实例
    currentGameCollectionManager = new GameCollectionManager(userId);
    currentUserId = userId;
    return currentGameCollectionManager;
  }
};

/**
 * 清理当前游戏收藏管理器（用户切换时调用）
 */
export const clearGameCollectionManager = () => {
  currentGameCollectionManager = null;
  currentUserId = null;
  console.log('🧹 已清理游戏收藏管理器');
};

// 为了向后兼容，保留全局实例（游客模式）
const gameCollectionManager = getGameCollectionManager();

// ========================= 便捷函数（支持用户隔离） =========================

export const addGameToCollection = (gameData, userId = null) => {
  const manager = getGameCollectionManager(userId);
  return manager.addGame(gameData);
};

export const removeGameFromCollection = (gameId, userId = null) => {
  const manager = getGameCollectionManager(userId);
  return manager.removeGame(gameId);
};

export const updateGameInCollection = (gameId, updates, userId = null) => {
  const manager = getGameCollectionManager(userId);
  return manager.updateGame(gameId, updates);
};

export const isGameInCollection = (gameId, userId = null) => {
  const manager = getGameCollectionManager(userId);
  return manager.isGameCollected(gameId);
};

export const isGameInCollectionByName = (gameName, userId = null) => {
  const manager = getGameCollectionManager(userId);
  return manager.isGameCollectedByName(gameName);
};

export const getGameCollection = (options = {}, userId = null) => {
  try {
    const manager = getGameCollectionManager(userId);
    return manager.getCollection(options);
  } catch (error) {
    console.error('获取游戏收藏列表失败:', error);
    return []; // 返回空数组作为兜底
  }
};

export const getCollectionStats = (userId = null) => {
  const manager = getGameCollectionManager(userId);
  return manager.getStats();
};

export const clearGameCollection = (userId = null) => {
  const manager = getGameCollectionManager(userId);
  return manager.clearCollection();
};

export const exportGameCollection = (format, userId = null) => {
  const manager = getGameCollectionManager(userId);
  return manager.exportCollection(format);
};

// 导出管理器类
export { GameCollectionManager };
export default gameCollectionManager;
