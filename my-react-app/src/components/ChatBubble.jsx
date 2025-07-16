import { useState } from 'react';

const ChatBubble = ({ content, isUser }) => {
  const [copied, setCopied] = useState(false);
  const isThinking = content === '正在思考...'; // 检测思考状态

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className={`chat-bubble ${isUser ? 'user' : 'ai'}`} style={{ position: 'relative' }}>
      {/* 思考状态显示动画 */}
      {isThinking ? (
        <div className="thinking-indicator">
          <span className="dot"></span>
          <span className="dot"></span>
          <span className="dot"></span>
        </div>
      ) : content}
      
      {!isUser && !isThinking && (
        <div className="bubble-toolbar">
          <button className="bubble-btn copy" onClick={handleCopy}>
            {copied ? '已复制' : '复制'}
          </button>
          <button className="bubble-btn regen">重新生成</button>
        </div>
      )}
    </div>
  );
};

export default ChatBubble;