/**
 * GameCollection.jsx - 游戏收藏列表组件
 * 
 * 提供完整的游戏收藏管理界面，包括：
   // 加载收藏数据
  const loadCollectionData = useCallback(() => {
    try {
      setLoading(true);
      const userId = getUserId();
      const collectionData = getGameCollection({
        search: searchTerm,
        filter: filters,
        sortBy,
        sortOrder
      }, userId);
      const statsData = getCollectionStats(userId);
      
      setCollection(collectionData);
      setStats(statsData);
    } catch (error) {
      console.error('加载收藏数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filters, sortBy, sortOrder, getUserId]);视图）
 * 2. 🔍 搜索和过滤功能
 * 3. ➕ 添加/删除游戏
 * 4. ✏️ 编辑游戏信息
 * 5. 📊 收藏统计展示
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  getGameCollection, 
  addGameToCollection, 
  removeGameFromCollection, 
  updateGameInCollection,
  getCollectionStats,
  isGameInCollectionByName,
  exportGameCollection
} from '../utils/gameCollection';
import '../assets/styles/components/GameCollection.css';

const GameCollection = () => {
  const navigate = useNavigate();
  const { user } = useAuth(); // 获取当前用户信息
  
  // 获取用户ID（用于收藏隔离）
  const getUserId = useCallback(() => {
    return user?.username || null;
  }, [user?.username]);
  
  // ========================= 状态管理 =========================
  const [collection, setCollection] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  
  // 视图控制
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingGame, setEditingGame] = useState(null);
  
  // 搜索和过滤
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    playStatus: 'all',
    genre: 'all',
    platform: 'all',
    minRating: 0
  });
  const [sortBy, setSortBy] = useState('addedDate');
  const [sortOrder, setSortOrder] = useState('desc');

  // 新游戏表单
  const [newGame, setNewGame] = useState({
    name: '',
    description: '',
    genres: [],
    platform: '',
    releaseDate: '',
    rating: 0,
    notes: ''
  });

  // ========================= 数据加载和更新 =========================
  
  const loadCollectionData = useCallback(() => {
    try {
      setLoading(true);
      const collectionData = getGameCollection({
        search: searchTerm,
        filter: filters,
        sortBy,
        sortOrder
      });
      const statsData = getCollectionStats();
      
      setCollection(collectionData);
      setStats(statsData);
    } catch (error) {
      console.error('加载收藏数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filters, sortBy, sortOrder]);

  useEffect(() => {
    loadCollectionData();
  }, [loadCollectionData]);

  // ========================= 游戏操作函数 =========================
  
  const handleAddGame = useCallback(async () => {
    if (!newGame.name.trim()) {
      alert('请输入游戏名称');
      return;
    }

    const userId = getUserId();
    if (isGameInCollectionByName(newGame.name, userId)) {
      alert('该游戏已在收藏列表中');
      return;
    }

    const result = addGameToCollection({
      ...newGame,
      source: 'manual',
      genres: typeof newGame.genres === 'string' ? 
        newGame.genres.split(',').map(g => g.trim()).filter(g => g) : 
        newGame.genres
    }, userId);

    if (result.success) {
      setNewGame({
        name: '',
        description: '',
        genres: [],
        platform: '',
        releaseDate: '',
        rating: 0,
        notes: ''
      });
      setShowAddForm(false);
      loadCollectionData();
      alert('游戏已添加到收藏列表！');
    } else {
      alert(result.message || '添加失败，请重试');
    }
  }, [newGame, loadCollectionData]);

  const handleRemoveGame = useCallback((gameId, gameName) => {
    if (confirm(`确定要从收藏列表中移除"${gameName}"吗？`)) {
      const userId = getUserId();
      const result = removeGameFromCollection(gameId, userId);
      if (result.success) {
        loadCollectionData();
        alert('游戏已从收藏列表移除');
      } else {
        alert(result.message || '移除失败，请重试');
      }
    }
  }, [loadCollectionData, getUserId]);

  const handleUpdateGame = useCallback((gameId, updates) => {
    const userId = getUserId();
    const result = updateGameInCollection(gameId, updates, userId);
    if (result.success) {
      loadCollectionData();
      setEditingGame(null);
      alert('游戏信息已更新');
    } else {
      alert(result.message || '更新失败，请重试');
    }
  }, [loadCollectionData, getUserId]);

  const handleExport = useCallback((format) => {
    try {
      const userId = getUserId();
      const data = exportGameCollection(format, userId);
      const blob = new Blob([data], { 
        type: format === 'json' ? 'application/json' : 'text/csv' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `game-collection.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
    }
  }, []);

  // ========================= 渲染辅助函数 =========================
  
  const renderGameCard = useCallback((game) => (
    <div key={game.id} className="game-card">
      <div className="game-card-header">
        <h3 className="game-title">{game.name}</h3>
        <div className="game-actions">
          <button 
            className="btn-edit"
            onClick={() => setEditingGame(game)}
            title="编辑游戏信息"
          >
            ✏️
          </button>
          <button 
            className="btn-remove"
            onClick={() => handleRemoveGame(game.id, game.name)}
            title="从收藏中移除"
          >
            🗑️
          </button>
        </div>
      </div>
      
      {game.description && (
        <p className="game-description">{game.description}</p>
      )}
      
      <div className="game-meta">
        {game.genres.length > 0 && (
          <div className="game-genres">
            {game.genres.map(genre => (
              <span key={genre} className="genre-tag">{genre}</span>
            ))}
          </div>
        )}
        
        {game.platform && (
          <div className="game-platform">平台: {game.platform}</div>
        )}
        
        {game.rating > 0 && (
          <div className="game-rating">评分: {game.rating}/10</div>
        )}
        
        <div className="game-status">
          状态: {getPlayStatusText(game.playStatus)}
        </div>
        
        <div className="game-added-date">
          添加于: {new Date(game.addedDate).toLocaleDateString()}
        </div>
      </div>
      
      {game.notes && (
        <div className="game-notes">
          <strong>备注:</strong> {game.notes}
        </div>
      )}
    </div>
  ), [handleRemoveGame]);

  const renderGameList = useCallback((game) => (
    <tr key={game.id} className="game-row">
      <td className="game-name">{game.name}</td>
      <td className="game-genres">
        {game.genres.slice(0, 2).join(', ')}
        {game.genres.length > 2 && '...'}
      </td>
      <td className="game-platform">{game.platform}</td>
      <td className="game-rating">{game.rating || '-'}</td>
      <td className="game-status">{getPlayStatusText(game.playStatus)}</td>
      <td className="game-added">{new Date(game.addedDate).toLocaleDateString()}</td>
      <td className="game-actions">
        <button 
          className="btn-edit-small"
          onClick={() => setEditingGame(game)}
          title="编辑"
        >
          ✏️
        </button>
        <button 
          className="btn-remove-small"
          onClick={() => handleRemoveGame(game.id, game.name)}
          title="删除"
        >
          🗑️
        </button>
      </td>
    </tr>
  ), [handleRemoveGame]);

  const getPlayStatusText = (status) => {
    const statusMap = {
      'want_to_play': '想玩',
      'playing': '在玩',
      'completed': '已玩',
      'mastered': '已通关'
    };
    return statusMap[status] || status;
  };

  // ========================= 组件渲染 =========================
  
  if (loading) {
    return (
      <div className="game-collection-loading">
        <div className="loading-spinner">📚</div>
        <p>加载收藏列表中...</p>
      </div>
    );
  }

  return (
    <div className="game-collection">
      {/* 页面标题和统计 */}
      <div className="collection-header">
        <div className="header-left">
          <button 
            className="btn-back"
            onClick={() => navigate('/welcome')}
            title="返回主页"
          >
            ← 返回
          </button>
          <h1>我的游戏收藏</h1>
        </div>
        <div className="collection-stats">
          <span className="stat-item">总计: {stats.total || 0}</span>
          <span className="stat-item">想玩: {stats.byStatus?.want_to_play || 0}</span>
          <span className="stat-item">在玩: {stats.byStatus?.playing || 0}</span>
          <span className="stat-item">已玩: {stats.byStatus?.completed || 0}</span>
        </div>
      </div>

      {/* 工具栏 */}
      <div className="collection-toolbar">
        <div className="toolbar-left">
          <button 
            className="btn-add-game"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            ➕ 添加游戏
          </button>
          
          <div className="view-toggle">
            <button 
              className={`btn-view ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              ⊞ 网格
            </button>
            <button 
              className={`btn-view ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              ☰ 列表
            </button>
          </div>
        </div>

        <div className="toolbar-right">
          <input
            type="text"
            className="search-input"
            placeholder="搜索游戏..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          
          <select 
            className="filter-select"
            value={filters.playStatus}
            onChange={(e) => setFilters(prev => ({ ...prev, playStatus: e.target.value }))}
          >
            <option value="all">全部状态</option>
            <option value="want_to_play">想玩</option>
            <option value="playing">在玩</option>
            <option value="completed">已玩</option>
            <option value="mastered">已通关</option>
          </select>

          <select 
            className="sort-select"
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field);
              setSortOrder(order);
            }}
          >
            <option value="addedDate-desc">最新添加</option>
            <option value="addedDate-asc">最早添加</option>
            <option value="name-asc">名称 A-Z</option>
            <option value="name-desc">名称 Z-A</option>
            <option value="rating-desc">评分高到低</option>
            <option value="rating-asc">评分低到高</option>
          </select>

          <div className="export-buttons">
            <button 
              className="btn-export"
              onClick={() => handleExport('json')}
              title="导出为JSON"
            >
              📄 JSON
            </button>
            <button 
              className="btn-export"
              onClick={() => handleExport('csv')}
              title="导出为CSV"
            >
              📊 CSV
            </button>
          </div>
        </div>
      </div>

      {/* 添加游戏表单 */}
      {showAddForm && (
        <div className="add-game-form">
          <h3>添加新游戏</h3>
          <div className="form-grid">
            <input
              type="text"
              placeholder="游戏名称 *"
              value={newGame.name}
              onChange={(e) => setNewGame(prev => ({ ...prev, name: e.target.value }))}
            />
            <input
              type="text"
              placeholder="游戏类型 (用逗号分隔)"
              value={Array.isArray(newGame.genres) ? newGame.genres.join(', ') : newGame.genres}
              onChange={(e) => setNewGame(prev => ({ ...prev, genres: e.target.value }))}
            />
            <input
              type="text"
              placeholder="游戏平台"
              value={newGame.platform}
              onChange={(e) => setNewGame(prev => ({ ...prev, platform: e.target.value }))}
            />
            <input
              type="number"
              placeholder="评分 (1-10)"
              min="1"
              max="10"
              value={newGame.rating}
              onChange={(e) => setNewGame(prev => ({ ...prev, rating: parseInt(e.target.value) || 0 }))}
            />
          </div>
          <textarea
            placeholder="游戏描述"
            value={newGame.description}
            onChange={(e) => setNewGame(prev => ({ ...prev, description: e.target.value }))}
          />
          <textarea
            placeholder="个人备注"
            value={newGame.notes}
            onChange={(e) => setNewGame(prev => ({ ...prev, notes: e.target.value }))}
          />
          <div className="form-actions">
            <button className="btn-save" onClick={handleAddGame}>
              保存
            </button>
            <button className="btn-cancel" onClick={() => setShowAddForm(false)}>
              取消
            </button>
          </div>
        </div>
      )}

      {/* 游戏列表 */}
      <div className="collection-content">
        {collection.length === 0 ? (
          <div className="empty-collection">
            <div className="empty-icon">🎮</div>
            <h3>收藏列表为空</h3>
            <p>开始添加你感兴趣的游戏吧！</p>
            <button 
              className="btn-add-first"
              onClick={() => setShowAddForm(true)}
            >
              添加第一个游戏
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="games-grid">
            {collection.map(renderGameCard)}
          </div>
        ) : (
          <div className="games-table-container">
            <table className="games-table">
              <thead>
                <tr>
                  <th>游戏名称</th>
                  <th>类型</th>
                  <th>平台</th>
                  <th>评分</th>
                  <th>状态</th>
                  <th>添加日期</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {collection.map(renderGameList)}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 编辑游戏弹窗 */}
      {editingGame && (
        <div className="edit-modal-overlay" onClick={() => setEditingGame(null)}>
          <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
            <h3>编辑游戏信息</h3>
            <div className="edit-form">
              <input
                type="text"
                placeholder="游戏名称"
                value={editingGame.name}
                onChange={(e) => setEditingGame(prev => ({ ...prev, name: e.target.value }))}
              />
              <input
                type="text"
                placeholder="游戏类型 (用逗号分隔)"
                value={editingGame.genres.join(', ')}
                onChange={(e) => setEditingGame(prev => ({ 
                  ...prev, 
                  genres: e.target.value.split(',').map(g => g.trim()).filter(g => g)
                }))}
              />
              <input
                type="text"
                placeholder="游戏平台"
                value={editingGame.platform}
                onChange={(e) => setEditingGame(prev => ({ ...prev, platform: e.target.value }))}
              />
              <input
                type="number"
                placeholder="评分 (1-10)"
                min="1"
                max="10"
                value={editingGame.rating}
                onChange={(e) => setEditingGame(prev => ({ ...prev, rating: parseInt(e.target.value) || 0 }))}
              />
              <select
                value={editingGame.playStatus}
                onChange={(e) => setEditingGame(prev => ({ ...prev, playStatus: e.target.value }))}
              >
                <option value="want_to_play">想玩</option>
                <option value="playing">在玩</option>
                <option value="completed">已玩</option>
                <option value="mastered">已通关</option>
              </select>
              <textarea
                placeholder="游戏描述"
                value={editingGame.description}
                onChange={(e) => setEditingGame(prev => ({ ...prev, description: e.target.value }))}
              />
              <textarea
                placeholder="个人备注"
                value={editingGame.notes}
                onChange={(e) => setEditingGame(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
            <div className="edit-actions">
              <button 
                className="btn-save"
                onClick={() => handleUpdateGame(editingGame.id, editingGame)}
              >
                保存更改
              </button>
              <button 
                className="btn-cancel"
                onClick={() => setEditingGame(null)}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameCollection;
