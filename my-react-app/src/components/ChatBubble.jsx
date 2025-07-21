import React, { useState, useCallback, useMemo } from 'react';
import { useFunctionContext } from '../context/FunctionContext';

const ChatBubble = ({ content, isUser, messageId, temp }) => {
  const [copied, setCopied] = useState(false);
  const { regenerateMessage, isLoading, abortResponse } = useFunctionContext();
  
  // 检测思考状态
  const isThinking = useMemo(() => 
    content === '正在思考...' || content === '正在重新思考...' || temp,
    [content, temp]
  );

  // 检测当前消息是否正在重新生成（基于内容判断）
  const isCurrentlyRegenerating = useMemo(() => 
    content === '正在重新思考...' || (temp && !isUser),
    [content, temp, isUser]
  );

  // 处理复制功能 - 兼容多种环境
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

  // 处理重新生成
  const handleRegenerate = useCallback(async () => {
    if (messageId && !isCurrentlyRegenerating && !isLoading) {
      await regenerateMessage(messageId);
    }
  }, [messageId, isCurrentlyRegenerating, isLoading, regenerateMessage]);

  // 处理终止重新生成
  const handleAbortRegenerate = useCallback(() => {
    abortResponse();
  }, [abortResponse]);

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
    
    // 移除###标记
    const contentWithoutHashes = content.replace(/###/g, '');
    // 移除**标记
    const contentWithoutBold = contentWithoutHashes.replace(/\*\*/g, '');
    
    // 处理换行
    return contentWithoutBold.split('\n').map((line, index) => (
      <span key={index}>
        {line}
        {index < contentWithoutBold.split('\n').length - 1 && <br />}
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