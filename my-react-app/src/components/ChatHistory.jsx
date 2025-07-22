import React, { useState, useEffect, useCallback } from 'react';
import { chatHistoryManager } from '../utils/chatHistory';
import { useFunctionContext } from '../context/FunctionContext';
import '../assets/styles/components/chat-history.css';

const ChatHistory = ({ isOpen, onClose }) => {
  const [histories, setHistories] = useState([]);
  const [filteredHistories, setFilteredHistories] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedFunction, setSelectedFunction] = useState('all');
  const [loading, setLoading] = useState(false);
  const { VALID_FUNCTION_TYPES } = useFunctionContext();

  // 功能类型映射
  const functionNames = {
    general: '通用对话',
    play: '游戏推荐',
    game_guide: '游戏攻略',
    doc_qa: '文档问答',
    game_wiki: '游戏百科'
  };

  // 加载历史记录
  const loadHistories = useCallback(() => {
    setLoading(true);
    try {
      const allHistories = chatHistoryManager.getAllHistories();
      setHistories(allHistories);
      setFilteredHistories(allHistories);
    } catch (error) {
      console.error('Failed to load chat histories:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 筛选历史记录
  const filterHistories = useCallback(() => {
    let filtered = histories;

    // 按功能类型筛选
    if (selectedFunction !== 'all') {
      filtered = filtered.filter(h => h.functionType === selectedFunction);
    }

    // 按关键词搜索
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase();
      filtered = filtered.filter(h => 
        h.title.toLowerCase().includes(keyword) ||
        h.messages.some(msg => 
          msg.content.toLowerCase().includes(keyword)
        )
      );
    }

    setFilteredHistories(filtered);
  }, [histories, selectedFunction, searchKeyword]);

  // 初始化和筛选
  useEffect(() => {
    if (isOpen) {
      loadHistories();
    }
  }, [isOpen, loadHistories]);

  useEffect(() => {
    filterHistories();
  }, [filterHistories]);

  // 删除聊天记录
  const handleDeleteChat = (e, chatId) => {
    e.stopPropagation();
    if (confirm('确定要删除这个聊天记录吗？')) {
      chatHistoryManager.deleteChat(chatId);
      loadHistories();
    }
  };

  // 清空所有历史记录
  const handleClearAll = () => {
    if (confirm('确定要清空所有聊天历史吗？此操作无法撤销。')) {
      chatHistoryManager.clearAllHistories();
      loadHistories();
    }
  };

  // 导出历史记录
  const handleExport = () => {
    chatHistoryManager.exportHistories();
  };

  // 格式化时间
  const formatTime = (timeString) => {
    const date = new Date(timeString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else if (diffDays === 1) {
      return '昨天';
    } else if (diffDays < 7) {
      return `${diffDays}天前`;
    } else {
      return date.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="chat-history-overlay">
      <div className="chat-history-modal">
        {/* 标题栏 */}
        <div className="chat-history-header">
          <h2>聊天历史</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {/* 搜索和筛选 */}
        <div className="chat-history-filters">
          <input
            type="text"
            placeholder="搜索聊天记录..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="search-input"
          />
          
          <select
            value={selectedFunction}
            onChange={(e) => setSelectedFunction(e.target.value)}
            className="function-filter"
          >
            <option value="all">所有功能</option>
            {VALID_FUNCTION_TYPES.map(func => (
              <option key={func} value={func}>
                {functionNames[func] || func}
              </option>
            ))}
          </select>
        </div>

        {/* 操作按钮 */}
        <div className="chat-history-actions">
          <button onClick={handleClearAll} className="action-btn danger">
            清空历史
          </button>
          <button onClick={handleExport} className="action-btn">
            导出历史
          </button>
        </div>

        {/* 历史记录列表 */}
        <div className="chat-history-list">
          {loading ? (
            <div className="loading">加载中...</div>
          ) : filteredHistories.length === 0 ? (
            <div className="empty-state">
              {searchKeyword || selectedFunction !== 'all' 
                ? '没有找到匹配的聊天记录' 
                : '暂无聊天历史'}
            </div>
          ) : (
            filteredHistories.map(history => (
              <div
                key={history.id}
                className="history-item"
              >
                <div className="history-header">
                  <span className="history-title">{history.title}</span>
                  <button
                    className="delete-btn"
                    onClick={(e) => handleDeleteChat(e, history.id)}
                    title="删除"
                  >
                    🗑️
                  </button>
                </div>
                
                <div className="history-meta">
                  <span className="history-function">
                    {functionNames[history.functionType] || history.functionType}
                  </span>
                  <span className="history-count">
                    {history.messageCount} 条消息
                  </span>
                  <span className="history-time">
                    {formatTime(history.updatedAt)}
                  </span>
                </div>
                
                {/* 预览第一条消息 */}
                {history.messages.length > 0 && (
                  <div className="history-preview">
                    {history.messages.find(msg => msg.isUser)?.content.substring(0, 100) || 
                     history.messages[0]?.content.substring(0, 100)}
                    {(history.messages.find(msg => msg.isUser)?.content.length > 100 || 
                      history.messages[0]?.content.length > 100) && '...'}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* 统计信息 */}
        <div className="chat-history-stats">
          共 {histories.length} 条记录
          {searchKeyword || selectedFunction !== 'all' ? 
            ` (筛选后 ${filteredHistories.length} 条)` : ''}
        </div>
      </div>
    </div>
  );
};

export default ChatHistory;
