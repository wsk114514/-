/**
 * testGameData.js - 测试游戏数据
 * 
 * 提供一些示例游戏数据用于测试"猜您想问"功能
 */

import { addGameToCollection } from './gameCollection';

// 示例游戏数据
const SAMPLE_GAMES = [
  {
    name: '艾尔登法环',
    description: '一款由宫崎英高制作的开放世界动作RPG游戏',
    genres: ['RPG', 'Action', 'Open World'],
    platform: 'PC',
    releaseDate: '2022-02-25',
    rating: 9.5,
    coverImage: '',
    source: 'manual',
    notes: '画面精美，剧情引人入胜',
    playStatus: 'playing'
  },
  {
    name: '塞尔达传说：旷野之息',
    description: '任天堂开发的开放世界冒险游戏',
    genres: ['Adventure', 'Open World', 'Action'],
    platform: 'Nintendo Switch',
    releaseDate: '2017-03-03',
    rating: 9.0,
    coverImage: '',
    source: 'manual',
    notes: '自由度极高的探索体验',
    playStatus: 'completed'
  },
  {
    name: '文明6',
    description: '经典回合制策略游戏',
    genres: ['Strategy', 'Turn-based'],
    platform: 'PC',
    releaseDate: '2016-10-21',
    rating: 8.5,
    coverImage: '',
    source: 'manual',
    notes: '适合长时间游玩',
    playStatus: 'want_to_play'
  },
  {
    name: '胡闹厨房',
    description: '多人合作烹饪游戏',
    genres: ['Simulation', 'Multiplayer', 'Puzzle'],
    platform: 'PC',
    releaseDate: '2016-08-03',
    rating: 8.0,
    coverImage: '',
    source: 'manual',
    notes: '和朋友一起玩很有趣',
    playStatus: 'completed'
  },
  {
    name: '原神',
    description: '开放世界冒险游戏',
    genres: ['RPG', 'Adventure', 'Open World'],
    platform: 'PC',
    releaseDate: '2020-09-28',
    rating: 7.5,
    coverImage: '',
    source: 'manual',
    notes: '画风漂亮但氪金严重',
    playStatus: 'playing'
  }
];

/**
 * 添加示例游戏到收藏
 */
export const addSampleGames = () => {
  const results = [];
  
  SAMPLE_GAMES.forEach(game => {
    const result = addGameToCollection(game);
    results.push(result);
  });
  
  return results;
};

/**
 * 检查是否已有示例数据
 */
export const hasSampleData = () => {
  return SAMPLE_GAMES.some(game => {
    // 这里可以检查游戏是否已在收藏中
    return false; // 简化处理，总是返回false
  });
};

export default SAMPLE_GAMES;
