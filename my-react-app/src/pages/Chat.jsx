import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import ChatBubble from '../components/ChatBubble';
import InputBar from '../components/InputBar';
import { useFunctionContext } from '../context/FunctionContext';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import '../assets/styles/main.css';

const Chat = () => {
  const { messages, currentFunctionType, setMessages } = useFunctionContext();
  const location = useLocation();
  const [initialized, setInitialized] = useState(false);
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

  // 欢迎消息映射
  const welcomeMessages = useMemo(() => ({
    play: '🎮 欢迎使用游戏推荐功能！请告诉我您的游戏偏好，我会为您推荐合适的游戏。',
    game_guide: '📖 欢迎使用攻略助手！请告诉我您需要哪个游戏的攻略。',
    doc_qa: '📄 欢迎使用文档检索功能！请提出您的问题，我会在文档中查找答案。您也可以上传文档进行分析。',
    game_wiki: '📚 欢迎使用游戏百科！请告诉我您想了解的游戏或相关知识点。',
    general: '💬 您好！我是睿玩智库！有什么可以帮到您的吗？'
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

  // 初始化欢迎消息
  const initializeWelcomeMessage = useCallback(() => {
    const welcomeMessage = welcomeMessages[currentFunctionType] || welcomeMessages.general;
    
    // 检查是否已有欢迎消息
    const hasWelcomeMessage = messages.some(msg => 
      msg.content === welcomeMessage && !msg.isUser
    );
    
    if (!hasWelcomeMessage) {
      setMessages([{ 
        content: welcomeMessage, 
        isUser: false, 
        id: `welcome-${currentFunctionType}-${Date.now()}`,
        timestamp: new Date().toISOString()
      }]);
    }
  }, [currentFunctionType, messages, setMessages, welcomeMessages]);

  // 根据功能类型变化设置欢迎消息
  useEffect(() => {
    if (!initialized) {
      initializeWelcomeMessage();
      setInitialized(true);
    }
  }, [initialized, initializeWelcomeMessage]);

  // 路径变化时重新初始化
  useEffect(() => {
    if (initialized) {
      initializeWelcomeMessage();
    }
  }, [location.pathname, initializeWelcomeMessage, initialized]);

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