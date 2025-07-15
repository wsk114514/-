import { useState } from 'react';

const ChatBubble = ({ content, isUser }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className={`chat-bubble ${isUser ? 'user' : 'ai'}`} style={{ position: 'relative' }}>
      {content}
      {!isUser && (
        <div className="bubble-toolbar">
          <button className="bubble-btn copy" onClick={handleCopy}>
            {copied ? '已复制' : '复制'}
          </button>
          <button className="bubble-btn regen">重新生成</button>
          <button className="bubble-btn like">👍</button>
          <button className="bubble-btn dislike">👎</button>
        </div>
      )}
    </div>
  );
};

export default ChatBubble;