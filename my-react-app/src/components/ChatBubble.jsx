import React, { useState, useCallback, useMemo } from 'react';
import { useFunctionContext } from '../context/FunctionContext';

const ChatBubble = ({ content, isUser, messageId, temp }) => {
  const [copied, setCopied] = useState(false);
  const { regenerateMessage, isLoading } = useFunctionContext();
  
  // 检测思考状态
  const isThinking = useMemo(() => 
    content === '正在思考...' || content === '正在重新思考...' || temp,
    [content, temp]
  );

  // 处理复制功能
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (error) {
      console.error('复制失败:', error);
    }
  }, [content]);

  // 处理重新生成
  const handleRegenerate = useCallback(async () => {
    if (messageId && !isLoading) {
      await regenerateMessage(messageId);
    }
  }, [messageId, isLoading, regenerateMessage]);

  // 格式化内容显示
  const formattedContent = useMemo(() => {
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
    
    // 处理换行
    return content.split('\n').map((line, index) => (
      <span key={index}>
        {line}
        {index < content.split('\n').length - 1 && <br />}
      </span>
    ));
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
          
          <button 
            className="bubble-btn regen" 
            onClick={handleRegenerate}
            disabled={isLoading || !messageId}
            title="重新生成回答"
          >
            {isLoading ? '🔄 生成中...' : '🔄 重新生成'}
          </button>
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