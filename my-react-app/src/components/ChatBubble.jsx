import { useState } from 'react';
import { useFunctionContext } from '../context/FunctionContext';

const ChatBubble = ({ content, isUser, id }) => { // 添加id属性
  const [copied, setCopied] = useState(false);
  const isThinking = content === '正在思考...';
  const { regenerateMessage } = useFunctionContext(); // 获取重新生成函数

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const handleRegenerate = () => {
    if (!isUser && !isThinking && id) {
      regenerateMessage(id);
    }
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
          <button className="bubble-btn regen" onClick={handleRegenerate}>
            重新生成
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatBubble;