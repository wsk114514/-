import React, { useEffect, useCallback, useMemo, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import ChatBubble from '../components/ChatBubble';
import InputBar from '../components/InputBar';
import { useFunctionContext } from '../context/FunctionContext';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getCurrentUserId, getSessionInfo } from '../utils/userSession';
import { saveChatHistory } from '../utils/chatHistory';
import '../assets/styles/main.css';

const Chat = () => {
  const { messages, currentFunctionType, setMessages } = useFunctionContext();
  const location = useLocation();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const chatAreaRef = useRef(null);
  const messagesEndRef = useRef(null);
  
  // 功能标题映射
  const functionTitles = useMemo(() => ({
    play: '🎮 今天玩点什么好？',
    game_guide: '📖 攻略询问',
    doc_qa: '📄 文档检索问答',
    game_wiki: '📚 游戏百科',
    general: '💬 通用助手'
  }), []);

  // 自动滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'end'
    });
  }, []);

  // 当消息更新时自动滚动
  useEffect(() => {
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [messages, scrollToBottom]);

  // 功能描述信息
  const functionDescription = useMemo(() => {
    const descriptions = {
      play: '基于您的偏好，为您推荐最适合的游戏',
      game_guide: '提供专业的游戏攻略和技巧指导',
      doc_qa: '智能文档分析，快速检索答案',
      game_wiki: '全面的游戏知识库，解答您的疑问',
      general: '智能助手，为您提供全方位帮助'
    };
    return descriptions[currentFunctionType] || descriptions.general;
  }, [currentFunctionType]);

  return (
    <div className="container">
      <Sidebar />
      
      <main className="main-content">
        <div className="function-header">
          <div className="function-title">
            <h2>{functionTitles[currentFunctionType]}</h2>
            <p className="function-description">{functionDescription}</p>
          </div>
          
          {/* 添加主题切换按钮 */}
          <div className="theme-toggle">
            <button 
              onClick={toggleTheme} 
              className="theme-toggle-button"
              aria-label={theme === 'dark' ? '切换到浅色主题' : '切换到深色主题'}
            >
              {theme === 'dark' ? '🌙' : '🌞'}
            </button>
          </div>
          
          {/* 消息统计 */}
          <div className="chat-stats">
            <span className="message-count">
              消息: {messages.length}
            </span>
            {user && (
              <span className="user-badge">
                👤 {user.username}
              </span>
            )}
          </div>
        </div>
        
        {/* 聊天区域 */}
        <div 
          className="chat-area" 
          ref={chatAreaRef}
          role="log"
          aria-live="polite"
          aria-label="聊天消息区域"
        >
          {messages.length === 0 ? (
            <div className="empty-chat">
              <div className="empty-chat-icon">💭</div>
              <p>开始您的对话吧...</p>
            </div>
          ) : (
            messages.map((msg) => (
              <ChatBubble 
                key={msg.id} 
                isUser={msg.isUser} 
                content={msg.content}
                messageId={msg.id}
                temp={msg.temp}
              />
            ))
          )}
          
          {/* 滚动锚点 */}
          <div ref={messagesEndRef} />
        </div>
        
        {/* 输入区域 */}
        <div className="input-bar-container">
          <InputBar />
        </div>
      </main>
    </div>
  );
};

export default Chat;