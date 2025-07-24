/**
 * questionGenerator.js - 智能问题生成工具
 * 
 * 基于用户游戏收藏数据，智能分析并生成个性化问题推荐：
 * 1. 🎯 收藏分析 - 分析用户游戏偏好和类型分布
 * 2. 🤖 智能生成 - 根据收藏特征生成相关问题
 * 3. 🏷️ 分类管理 - 按问题类型进行分类和排序
 * 4. 🔄 动态更新 - 根据收藏变化实时更新问题
 */

import { getGameCollection, getCollectionStats } from './gameCollection';

// ========================= 问题模板配置 =========================

/**
 * 问题生成模板
 * 根据不同的游戏特征和用户行为模式生成对应问题
 */
const QUESTION_TEMPLATES = {
  // 基于游戏类型的问题
  genre: {
    rpg: [
      "我收藏了不少RPG游戏，能推荐一些类似{gameName}的角色扮演游戏吗？",
      "我喜欢RPG游戏的剧情体验，有什么好的故事向RPG推荐？",
      "收藏的RPG游戏都通关了，有什么新的RPG大作值得期待？"
    ],
    action: [
      "我收藏了{gameName}这类动作游戏，还有什么类似的动作游戏推荐？",
      "喜欢刺激的动作游戏，有什么高评分的动作游戏推荐？",
      "动作游戏玩腻了，有什么动作+其他元素的混合类型游戏？"
    ],
    strategy: [
      "我收藏了几款策略游戏，能推荐一些烧脑的策略游戏吗？",
      "喜欢{gameName}这种策略游戏，有什么类似的战术游戏？",
      "想要挑战更复杂的策略游戏，有什么推荐？"
    ],
    adventure: [
      "我收藏的冒险游戏都很有趣，还有什么探索类冒险游戏推荐？",
      "喜欢{gameName}的冒险元素，有什么类似的探索游戏？",
      "想要体验不同风格的冒险游戏，有什么推荐？"
    ],
    simulation: [
      "我收藏了{gameName}等模拟游戏，有什么其他类型的模拟游戏推荐？",
      "喜欢模拟经营类游戏，有什么好玩的模拟游戏？",
      "想要尝试更真实的模拟体验，有什么推荐？"
    ],
    puzzle: [
      "我收藏的解谜游戏都很有挑战性，还有什么烧脑的解谜游戏？",
      "喜欢{gameName}这种解谜游戏，有什么类似的益智游戏？",
      "想要挑战更难的解谜游戏，有什么推荐？"
    ]
  },

  // 基于游戏平台的问题
  platform: {
    pc: [
      "PC能玩什么最新的大作游戏？",
      "PC平台有什么游戏值得收藏？",
      "想要充分利用PC的性能，有什么画质超棒的游戏推荐？"
    ],
    nintendo: [
      "任天堂Switch有什么必玩的独占游戏？",
      "Switch上有什么适合随时游玩的轻松游戏？",
      "任天堂第一方游戏哪些最值得收藏？"
    ],
    playstation: [
      "PlayStation有什么独占大作推荐？",
      "PS平台的独占游戏哪些最值得体验？",
      "想要体验PlayStation的特色功能，有什么游戏推荐？"
    ],
    xbox: [
      "Xbox Game Pass上有什么好游戏推荐？",
      "Xbox独占游戏哪些最值得玩？",
      "想要体验Xbox的向下兼容，有什么经典游戏推荐？"
    ]
  },

  // 基于收藏数量的问题
  collection_size: {
    large: [
      "我收藏了{count}款游戏，有什么工具可以帮我管理游戏库？",
      "收藏的游戏太多了，如何选择下一个要玩的游戏？",
      "想要整理我的游戏收藏，有什么分类建议？"
    ],
    medium: [
      "我收藏了{count}款游戏，想要找到更多类似的游戏类型？",
      "根据我的收藏偏好，还能推荐什么类型的游戏？",
      "想要扩展我的游戏收藏，有什么新类型值得尝试？"
    ],
    small: [
      "我刚开始收藏游戏，有什么必玩的经典游戏推荐？",
      "作为游戏新手，有什么容易上手的游戏推荐？",
      "想要建立我的游戏收藏库，有什么入门级游戏推荐？"
    ]
  },

  // 基于游戏状态的问题
  play_status: {
    want_to_play: [
      "我收藏了{gameName}但还没开始玩，这个游戏怎么样？",
      "想玩列表里的游戏太多了，应该先玩哪个？",
      "收藏的游戏都还没玩，有什么快速上手的推荐？"
    ],
    playing: [
      "我正在玩{gameName}，有什么攻略技巧分享？",
      "正在体验{gameName}，这个游戏的隐藏要素有哪些？",
      "玩{gameName}遇到困难，有什么建议？"
    ],
    completed: [
      "我已经通关了{gameName}，有什么类似的游戏推荐？",
      "通关{gameName}后感觉很棒，还有什么类似体验的游戏？",
      "完成了{gameName}，想要挑战更高难度的同类游戏？"
    ]
  },

  // 基于评分的问题
  rating: {
    high: [
      "我给{gameName}打了{rating}分，有什么其他高分游戏推荐？",
      "收藏的高分游戏都很棒，还有什么必玩的神作？",
      "喜欢高质量的游戏体验，有什么口碑最好的游戏？"
    ],
    medium: [
      "我对{gameName}评价一般，有什么更好的同类游戏？",
      "想要找到比收藏游戏更优秀的作品，有什么推荐？",
      "收藏的游戏质量参差不齐，有什么筛选标准建议？"
    ]
  },

  // 通用探索问题
  general: [
    "根据我的游戏收藏，你觉得我是什么类型的玩家？",
    "我的游戏品味如何？有什么改进建议？",
    "想要尝试完全不同的游戏类型，有什么推荐？",
    "我收藏的游戏有什么共同特点？",
    "基于我的收藏，今年有什么值得期待的新游戏？"
  ]
};

// ========================= 智能问题生成器 =========================

class QuestionGenerator {
  constructor() {
    this.collection = [];
    this.stats = {};
    this.generatedQuestions = [];
  }

  /**
   * 更新收藏数据
   * @param {string|null} userId - 用户ID
   */
  updateCollection(userId = null) {
    this.collection = getGameCollection({}, userId); // 传递空对象作为options
    this.stats = getCollectionStats(userId);
  }

  /**
   * 生成智能问题推荐
   * @param {number} maxQuestions - 最大问题数量
   * @param {string|null} userId - 用户ID
   * @returns {Array} 生成的问题列表
   */
  generateQuestions(maxQuestions = 6, userId = null) {
    this.updateCollection(userId);
    
    if (this.collection.length === 0) {
      return this.getDefaultQuestions();
    }

    const questions = [];
    
    // 基于收藏数量生成问题
    questions.push(...this.generateCollectionSizeQuestions());
    
    // 基于游戏类型生成问题
    questions.push(...this.generateGenreQuestions());
    
    // 基于游戏状态生成问题
    questions.push(...this.generatePlayStatusQuestions());
    
    // 基于评分生成问题
    questions.push(...this.generateRatingQuestions());
    
    // 基于平台生成问题
    questions.push(...this.generatePlatformQuestions());
    
    // 添加通用问题
    questions.push(...this.generateGeneralQuestions());

    // 去重、打乱顺序并限制数量
    const uniqueQuestions = [...new Set(questions)];
    const shuffledQuestions = this.shuffleArray(uniqueQuestions);
    
    this.generatedQuestions = shuffledQuestions.slice(0, maxQuestions);
    return this.generatedQuestions.map((question, index) => ({
      id: `q-${Date.now()}-${index}`,
      text: question,
      category: this.categorizeQuestion(question),
      priority: this.calculatePriority(question)
    }));
  }

  /**
   * 基于收藏数量生成问题
   */
  generateCollectionSizeQuestions() {
    const count = this.collection.length;
    let sizeCategory;
    
    if (count >= 20) sizeCategory = 'large';
    else if (count >= 5) sizeCategory = 'medium';
    else sizeCategory = 'small';
    
    const templates = QUESTION_TEMPLATES.collection_size[sizeCategory] || [];
    return templates.map(template => template.replace('{count}', count));
  }

  /**
   * 基于游戏类型生成问题
   */
  generateGenreQuestions() {
    const questions = [];
    const genreStats = this.stats.byGenre || {};
    
    // 获取最受欢迎的游戏类型
    const topGenres = Object.entries(genreStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([genre]) => genre.toLowerCase());
    
    topGenres.forEach(genre => {
      const templates = QUESTION_TEMPLATES.genre[genre] || QUESTION_TEMPLATES.genre.action;
      const gamesOfGenre = this.collection.filter(game => 
        game.genres.some(g => g.toLowerCase().includes(genre))
      );
      
      if (gamesOfGenre.length > 0) {
        const randomGame = gamesOfGenre[Math.floor(Math.random() * gamesOfGenre.length)];
        const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
        questions.push(randomTemplate.replace('{gameName}', randomGame.name));
      }
    });
    
    return questions;
  }

  /**
   * 基于游戏状态生成问题
   */
  generatePlayStatusQuestions() {
    const questions = [];
    const statusStats = this.stats.byStatus || {};
    
    // 想玩的游戏
    if (statusStats.want_to_play > 0) {
      const wantToPlayGames = this.collection.filter(game => game.playStatus === 'want_to_play');
      const randomGame = wantToPlayGames[Math.floor(Math.random() * wantToPlayGames.length)];
      const templates = QUESTION_TEMPLATES.play_status.want_to_play;
      const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
      questions.push(randomTemplate.replace('{gameName}', randomGame.name));
    }
    
    // 正在玩的游戏
    if (statusStats.playing > 0) {
      const playingGames = this.collection.filter(game => game.playStatus === 'playing');
      const randomGame = playingGames[Math.floor(Math.random() * playingGames.length)];
      const templates = QUESTION_TEMPLATES.play_status.playing;
      const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
      questions.push(randomTemplate.replace('{gameName}', randomGame.name));
    }
    
    // 已完成的游戏
    if (statusStats.completed > 0) {
      const completedGames = this.collection.filter(game => game.playStatus === 'completed');
      const randomGame = completedGames[Math.floor(Math.random() * completedGames.length)];
      const templates = QUESTION_TEMPLATES.play_status.completed;
      const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
      questions.push(randomTemplate.replace('{gameName}', randomGame.name));
    }
    
    return questions;
  }

  /**
   * 基于评分生成问题
   */
  generateRatingQuestions() {
    const questions = [];
    const highRatedGames = this.collection.filter(game => game.rating >= 8);
    const mediumRatedGames = this.collection.filter(game => game.rating >= 5 && game.rating < 8);
    
    if (highRatedGames.length > 0) {
      const randomGame = highRatedGames[Math.floor(Math.random() * highRatedGames.length)];
      const templates = QUESTION_TEMPLATES.rating.high;
      const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
      questions.push(randomTemplate
        .replace('{gameName}', randomGame.name)
        .replace('{rating}', randomGame.rating));
    }
    
    if (mediumRatedGames.length > 0) {
      const randomGame = mediumRatedGames[Math.floor(Math.random() * mediumRatedGames.length)];
      const templates = QUESTION_TEMPLATES.rating.medium;
      const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
      questions.push(randomTemplate.replace('{gameName}', randomGame.name));
    }
    
    return questions;
  }

  /**
   * 基于平台生成问题
   */
  generatePlatformQuestions() {
    const questions = [];
    const platformCounts = {};
    
    this.collection.forEach(game => {
      const platform = game.platform.toLowerCase();
      platformCounts[platform] = (platformCounts[platform] || 0) + 1;
    });
    
    const topPlatform = Object.entries(platformCounts)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (topPlatform) {
      const [platform] = topPlatform;
      const platformKey = this.normalizePlatformName(platform);
      const templates = QUESTION_TEMPLATES.platform[platformKey] || QUESTION_TEMPLATES.platform.pc;
      const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
      questions.push(randomTemplate);
    }
    
    return questions;
  }

  /**
   * 生成通用问题
   */
  generateGeneralQuestions() {
    const templates = QUESTION_TEMPLATES.general;
    const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
    return [randomTemplate];
  }

  /**
   * 获取默认问题（当用户没有收藏时）
   */
  getDefaultQuestions() {
    return [
      {
        id: 'default-1',
        text: '我是游戏新手，有什么入门级游戏推荐？',
        category: 'beginner',
        priority: 10
      },
      {
        id: 'default-2',
        text: '最近有什么热门的新游戏值得尝试？',
        category: 'trending',
        priority: 9
      },
      {
        id: 'default-3',
        text: '我想尝试不同类型的游戏，有什么建议？',
        category: 'explore',
        priority: 8
      },
      {
        id: 'default-4',
        text: '有什么经典的必玩游戏推荐？',
        category: 'classic',
        priority: 7
      },
      {
        id: 'default-5',
        text: '如何选择适合自己的游戏？',
        category: 'guide',
        priority: 6
      },
      {
        id: 'default-6',
        text: '游戏平台之间有什么区别？',
        category: 'platform',
        priority: 5
      }
    ];
  }

  /**
   * 问题分类
   */
  categorizeQuestion(question) {
    if (question.includes('推荐') || question.includes('建议')) return 'recommendation';
    if (question.includes('攻略') || question.includes('技巧')) return 'guide';
    if (question.includes('类型') || question.includes('风格')) return 'genre';
    if (question.includes('平台') || question.includes('PC') || question.includes('Switch')) return 'platform';
    if (question.includes('收藏') || question.includes('管理')) return 'collection';
    return 'general';
  }

  /**
   * 计算问题优先级
   */
  calculatePriority(question) {
    let priority = 5; // 基础优先级
    
    // 包含具体游戏名的问题优先级更高
    const hasGameName = this.collection.some(game => question.includes(game.name));
    if (hasGameName) priority += 3;
    
    // 推荐类问题优先级较高
    if (question.includes('推荐')) priority += 2;
    
    // 攻略类问题优先级中等
    if (question.includes('攻略')) priority += 1;
    
    return Math.min(priority, 10);
  }

  /**
   * 标准化平台名称
   */
  normalizePlatformName(platform) {
    const normalizedPlatform = platform.toLowerCase();
    if (normalizedPlatform.includes('pc') || normalizedPlatform.includes('steam')) return 'pc';
    if (normalizedPlatform.includes('switch') || normalizedPlatform.includes('nintendo')) return 'nintendo';
    if (normalizedPlatform.includes('playstation') || normalizedPlatform.includes('ps')) return 'playstation';
    if (normalizedPlatform.includes('xbox')) return 'xbox';
    return 'pc';
  }

  /**
   * 打乱数组顺序
   */
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

// ========================= 导出实例和工具函数 =========================

// 创建全局问题生成器实例
const questionGenerator = new QuestionGenerator();

// 导出便捷函数
export const generateSmartQuestions = (maxQuestions = 6, userId = null) => {
  return questionGenerator.generateQuestions(maxQuestions, userId);
};

export const updateQuestionCollection = (userId = null) => {
  return questionGenerator.updateCollection(userId);
};
export const getQuestionStats = () => questionGenerator.stats;

// 导出生成器类
export { QuestionGenerator };
export default questionGenerator;
