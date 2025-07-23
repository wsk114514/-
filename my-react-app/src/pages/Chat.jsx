import React, { useEffect, useCallback, useMemo, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import ChatBubble from '../components/ChatBubble';
import InputBar from '../components/InputBar';
import { useFunctionContext } from '../context/FunctionContext';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getCurrentUserId, getSessionInfo } from '../utils/userSession';
import { saveChatHistory } from '../utils/chatHistory';
import '../assets/styles/main.css';

/**
 * Chat 主聊天页面组件
 * 
 * 功能说明：
 * - 这是应用的核心聊天界面，整合了所有主要功能模块
 * - 提供多模式对话支持（游戏推荐、攻略、文档问答等）
 * - 实现智能滚动、消息管理、用户状态同步
 * - 响应式布局，适配不同设备尺寸
 * 
 * 核心特性：
 * - 🎯 多功能模式切换：支持5种不同的对话模式
 * - 💬 智能消息管理：自动滚动、历史保存、状态同步
 * - 🎨 主题适配：深色/浅色主题动态切换
 * - 📱 响应式设计：移动端和桌面端优化
 * - 🔄 实时更新：消息状态和功能切换实时响应
 * 
 * @returns {JSX.Element} 聊天页面组件
 */
const Chat = () => {
  // ========================= Context 状态获取 =========================
  
  // 功能状态管理：消息列表、当前功能类型、状态更新方法
  const { messages, currentFunctionType, setMessages } = useFunctionContext();
  
  // 路由信息：用于URL同步和功能切换
  const location = useLocation();
  
  // URL参数获取：用于接收预设问题
  const [searchParams] = useSearchParams();
  
  // 用户认证状态：当前登录用户信息
  const { user } = useAuth();
  
  // 主题状态：深色/浅色模式管理
  const { theme, toggleTheme } = useTheme();
  
  // ========================= Refs 引用管理 =========================
  
  // 聊天区域引用：用于滚动控制和交互管理
  const chatAreaRef = useRef(null);
  
  // 消息底部引用：用于自动滚动到最新消息
  const messagesEndRef = useRef(null);
  
  // ========================= 配置常量 =========================
  
  /**
   * 功能标题映射
   * 为每种功能类型提供友好的显示标题
   */
  const functionTitles = useMemo(() => ({
    play: '🎮 今天玩点什么好？',
    game_guide: '📖 攻略询问',
    doc_qa: '📄 文档检索问答',
    game_wiki: '📚 游戏百科',
    general: '💬 通用助手'
  }), []);

  // ========================= 交互行为处理 =========================

  /**
   * 自动滚动到底部
   * 
   * 功能说明：
   * - 当有新消息时自动滚动到聊天底部
   * - 使用平滑滚动效果提升用户体验
   * - 防止用户错过最新的AI回复
   */
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'end'
    });
  }, []);

  /**
   * 监听消息变化，自动滚动
   * 
   * 实现逻辑：
   * - 消息数组变化时触发滚动
   * - 添加延迟确保DOM更新完成
   * - 清理定时器防止内存泄露
   */
  useEffect(() => {
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [messages, scrollToBottom]);

  // ========================= 计算属性 =========================

  /**
   * 功能描述信息
   * 根据当前功能类型显示相应的描述文本
   */
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

  // ========================= 组件渲染 =========================

  return (
    <div className="container">
      {/* 侧边栏：功能导航和设置 */}
      <Sidebar />
      
      {/* 主内容区域：聊天界面 */}
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