/**
 * SmartQuestions.jsx - 智能问题推荐组件
 * 
 * 基于用户游戏收藏智能生成问题推荐，提供一键跳转聊天功能：
 * 1. 🤖 智能分析 - 分析用户收藏生成个性化问题
 * 2. 🎯 分类展示 - 按问题类型和优先级展示
 * 3. 🚀 一键跳转 - 点击问题直接跳转到聊天页面
 * 4. 🔄 动态更新 - 根据收藏变化实时更新问题
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateSmartQuestions, updateQuestionCollection } from '../utils/questionGenerator';
import { getCollectionStats } from '../utils/gameCollection';

const SmartQuestions = ({ maxQuestions = 6, showTitle = true, compact = false }) => {
  // ========================= 组件状态 =========================
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(!compact);
  const [stats, setStats] = useState({});
  
  const navigate = useNavigate();

  // ========================= 问题生成和更新 =========================

  /**
   * 生成智能问题
   */
  const generateQuestions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 更新收藏数据
      updateQuestionCollection();
      
      // 生成问题
      const generatedQuestions = generateSmartQuestions(maxQuestions);
      setQuestions(generatedQuestions);
      
      // 获取统计信息
      const collectionStats = getCollectionStats();
      setStats(collectionStats);
      
    } catch (err) {
      console.error('生成智能问题失败:', err);
      setError('生成问题失败，请重试');
    } finally {
      setLoading(false);
    }
  }, [maxQuestions]);

  /**
   * 初始化加载问题
   */
  useEffect(() => {
    generateQuestions();
  }, [generateQuestions]);

  // ========================= 交互处理 =========================

  /**
   * 处理问题点击 - 跳转到游戏推荐页面并自动输入问题
   */
  const handleQuestionClick = useCallback((question) => {
    console.log('点击问题:', question.text); // 调试日志
    
    // 跳转到游戏推荐页面，并通过URL参数传递问题
    const encodedQuestion = encodeURIComponent(question.text);
    navigate(`/play?question=${encodedQuestion}`);
  }, [navigate]);

  /**
   * 刷新问题
   */
  const handleRefresh = useCallback(() => {
    generateQuestions();
  }, [generateQuestions]);

  /**
   * 切换展开/收起状态
   */
  const toggleExpanded = useCallback(() => {
    setExpanded(prev => !prev);
  }, []);

  // ========================= 渲染辅助 =========================

  /**
   * 获取问题类别的显示信息
   */
  const getCategoryInfo = (category) => {
    const categoryMap = {
      recommendation: { icon: '🎯', label: '推荐', color: '#667eea' },
      guide: { icon: '📖', label: '攻略', color: '#f093fb' },
      genre: { icon: '🎮', label: '类型', color: '#4facfe' },
      platform: { icon: '💻', label: '平台', color: '#43e97b' },
      collection: { icon: '📚', label: '收藏', color: '#fa709a' },
      general: { icon: '💬', label: '通用', color: '#ffeaa7' },
      beginner: { icon: '🌱', label: '新手', color: '#55a3ff' },
      trending: { icon: '🔥', label: '热门', color: '#ff6b6b' },
      explore: { icon: '🧭', label: '探索', color: '#4ecdc4' },
      classic: { icon: '👑', label: '经典', color: '#ffd93d' }
    };
    
    return categoryMap[category] || categoryMap.general;
  };

  /**
   * 渲染统计信息
   */
  const renderStats = () => {
    if (!stats.total || stats.total === 0) return null;
    
    return (
      <div className="smart-questions-stats">
        <span className="stats-item">
          📚 收藏 {stats.total} 款游戏
        </span>
        {stats.averageRating > 0 && (
          <span className="stats-item">
            ⭐ 平均评分 {stats.averageRating.toFixed(1)}
          </span>
        )}
      </div>
    );
  };

  // ========================= 渲染组件 =========================

  if (loading) {
    return (
      <div className="smart-questions loading">
        <div className="smart-questions-header">
          <h3>🤖 猜您想问</h3>
        </div>
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>正在分析您的游戏偏好...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="smart-questions error">
        <div className="smart-questions-header">
          <h3>🤖 猜您想问</h3>
        </div>
        <div className="error-message">
          <p>{error}</p>
          <button onClick={handleRefresh} className="retry-btn">
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`smart-questions ${compact ? 'compact' : ''} ${expanded ? 'expanded' : 'collapsed'}`}>
      {/* 组件头部 */}
      {showTitle && (
        <div className="smart-questions-header">
          <div className="header-content">
            <h3>🤖 猜您想问</h3>
            <p className="header-subtitle">基于您的游戏收藏智能推荐</p>
          </div>
          
          <div className="header-actions">
            <button 
              onClick={handleRefresh} 
              className="refresh-btn"
              title="刷新问题"
            >
              🔄
            </button>
            {compact && (
              <button 
                onClick={toggleExpanded}
                className="expand-btn"
                title={expanded ? '收起' : '展开'}
              >
                {expanded ? '⬆️' : '⬇️'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* 统计信息 */}
      {expanded && renderStats()}

      {/* 问题列表 */}
      {expanded && (
        <div className="questions-container">
          {questions.length === 0 ? (
            <div className="empty-questions">
              <p>🎮 开始收藏游戏，获取个性化问题推荐！</p>
              <p>您可以在游戏推荐页面将感兴趣的游戏添加到收藏。</p>
            </div>
          ) : (
            <div className="questions-grid">
              {questions.map((question) => {
                const categoryInfo = getCategoryInfo(question.category);
                return (
                  <button
                    key={question.id}
                    className="question-card"
                    onClick={() => handleQuestionClick(question)}
                    style={{ '--category-color': categoryInfo.color }}
                  >
                    <div className="question-header">
                      <span className="question-icon">{categoryInfo.icon}</span>
                      <span className="question-category">{categoryInfo.label}</span>
                      <span className="question-priority">
                        {'★'.repeat(Math.min(question.priority, 5))}
                      </span>
                    </div>
                    <div className="question-text">
                      {question.text}
                    </div>
                    <div className="question-footer">
                      <span className="click-hint">点击询问 →</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 底部提示 */}
      {expanded && questions.length > 0 && (
        <div className="smart-questions-footer">
          <p>💡 点击任意问题，AI将为您详细解答</p>
        </div>
      )}
    </div>
  );
};

export default SmartQuestions;
