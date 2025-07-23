import React, { useState, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { useFunctionContext } from '../context/FunctionContext';

/**
 * 聊天气泡组件
 * 
 * 功能说明：
 * - 显示用户和AI的聊天消息
 * - 支持Markdown格式渲染
 * - 提供消息复制、重新生成等交互功能
 * - 支持思考状态和加载状态的显示
 * 
 * @param {Object} props - 组件属性
 * @param {string} props.content - 消息内容
 * @param {boolean} props.isUser - 是否为用户消息
 * @param {string} props.messageId - 消息唯一标识符
 * @param {boolean} props.temp - 是否为临时消息（如加载中的消息）
 * 
 * @returns {JSX.Element} 聊天气泡组件
 */
const ChatBubble = ({ content, isUser, messageId, temp }) => {
  // ========================= 状态管理 =========================
  
  // 复制状态 - 用于显示复制成功的反馈
  const [copied, setCopied] = useState(false);
  
  // 从功能上下文获取操作方法
  const { regenerateMessage, isLoading, abortResponse } = useFunctionContext();
  
  // ========================= 计算属性 =========================
  
  /**
   * 检测思考状态
   * 判断当前消息是否处于AI思考状态
   */
  const isThinking = useMemo(() => 
    content === '正在思考...' || content === '正在重新思考...' || temp,
    [content, temp]
  );

  /**
   * 检测当前消息是否正在重新生成
   * 基于消息内容和临时状态判断
   */
  const isCurrentlyRegenerating = useMemo(() => 
    content === '正在重新思考...' || (temp && !isUser),
    [content, temp, isUser]
  );

  // ========================= 事件处理函数 =========================

  /**
   * 处理复制功能 - 兼容多种浏览器环境
   * 
   * 功能说明：
   * - 优先使用现代Clipboard API
   * - 提供传统document.execCommand的后备方案
   * - 包含错误处理和用户反馈
   */
  const handleCopy = useCallback(async () => {
    try {
      // 优先使用现代 Clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
        return;
      }
      
      // 后备方案：使用传统的 document.execCommand
      const textArea = document.createElement('textarea');
      textArea.value = content;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      if (document.execCommand('copy')) {
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      } else {
        throw new Error('复制命令执行失败');
      }
      
      document.body.removeChild(textArea);
    } catch (error) {
      console.error('复制失败:', error);
      // 用户友好的错误提示
      alert('复制失败，请手动选择文本进行复制');
    }
  }, [content]);

  /**
   * 处理重新生成消息
   * 
   * 功能说明：
   * - 检查消息ID和当前状态
   * - 防止重复触发重新生成
   * - 调用上下文中的重新生成方法
   */
  const handleRegenerate = useCallback(async () => {
    if (messageId && !isCurrentlyRegenerating && !isLoading) {
      await regenerateMessage(messageId);
    }
  }, [messageId, isCurrentlyRegenerating, isLoading, regenerateMessage]);

  /**
   * 处理终止重新生成
   * 
   * 功能说明：
   * - 调用上下文中的终止响应方法
   * - 用于用户主动停止AI生成过程
   */
  const handleAbortRegenerate = useCallback(() => {
    abortResponse();
  }, [abortResponse]);

  // ========================= 内容渲染逻辑 =========================

  /**
   * 格式化内容显示
   * 根据消息状态决定渲染方式
   */
  const formattedContent = useMemo(() => {
    // 思考状态显示动画指示器
    if (isThinking) {
      return (
        <div className="thinking-indicator">
          <span className="dot"></span>
          <span className="dot"></span>
          <span className="dot"></span>
          <span className="thinking-text">{content}</span>
        </div>
      );
    }
    
    // 使用ReactMarkdown渲染Markdown内容
    return (
      <ReactMarkdown
        components={{
          // 自定义Markdown组件样式
          h1: ({children}) => <h1 style={{fontSize: '1.4em', margin: '0.5em 0', color: 'inherit'}}>{children}</h1>,
          h2: ({children}) => <h2 style={{fontSize: '1.3em', margin: '0.5em 0', color: 'inherit'}}>{children}</h2>,
          h3: ({children}) => <h3 style={{fontSize: '1.2em', margin: '0.5em 0', color: 'inherit'}}>{children}</h3>,
          p: ({children}) => <p style={{margin: '0.5em 0', lineHeight: '1.6'}}>{children}</p>,
          strong: ({children}) => <strong style={{fontWeight: 'bold', color: 'inherit'}}>{children}</strong>,
          em: ({children}) => <em style={{fontStyle: 'italic', color: 'inherit'}}>{children}</em>,
          ul: ({children}) => <ul style={{margin: '0.5em 0', paddingLeft: '1.5em'}}>{children}</ul>,
          ol: ({children}) => <ol style={{margin: '0.5em 0', paddingLeft: '1.5em'}}>{children}</ol>,
          li: ({children}) => <li style={{margin: '0.2em 0'}}>{children}</li>,
          code: ({children}) => (
            <code style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              padding: '0.1em 0.3em',
              borderRadius: '3px',
              fontFamily: 'monospace',
              fontSize: '0.9em'
            }}>
              {children}
            </code>
          ),
          pre: ({children}) => (
            <pre style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              padding: '1em',
              borderRadius: '5px',
              overflow: 'auto',
              margin: '0.5em 0'
            }}>
              {children}
            </pre>
          ),
          blockquote: ({children}) => (
            <blockquote style={{
              borderLeft: '3px solid #666',
              paddingLeft: '1em',
              margin: '0.5em 0',
              opacity: '0.8'
            }}>
              {children}
            </blockquote>
          )
        }}
      >
        {content}
      </ReactMarkdown>
    );
  }, [content, isThinking]);

  return (
    <div className={`chat-bubble ${isUser ? 'user' : 'ai'} ${temp ? 'temp' : ''}`}>
      <div className="bubble-content">
        {formattedContent}
      </div>
      
      {/* AI消息的操作按钮 */}
      {!isUser && !isThinking && (
        <div className="bubble-toolbar">
          <button 
            className="bubble-btn copy" 
            onClick={handleCopy}
            disabled={!content.trim()}
            title="复制内容"
          >
            {copied ? '✅ 已复制' : '📋 复制'}
          </button>
          
          {isCurrentlyRegenerating ? (
            <button 
              className="bubble-btn abort" 
              onClick={handleAbortRegenerate}
              title="停止重新生成"
            >
              🛑 停止
            </button>
          ) : (
            <button 
              className="bubble-btn regen" 
              onClick={handleRegenerate}
              disabled={!messageId || isLoading}
              title="重新生成回答"
            >
              🔄 重新生成
            </button>
          )}
        </div>
      )}
      
      {/* 用户消息的时间戳 */}
      {isUser && (
        <div className="bubble-timestamp">
          {new Date().toLocaleTimeString('zh-CN', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      )}
    </div>
  );
};

export default ChatBubble;