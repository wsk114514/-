import { useState } from 'react';
import { useFunctionContext } from '../context/FunctionContext';
import { getResponse } from '../services/api';

const InputBar = () => {
  const [input, setInput] = useState('');
  const { currentFunctionType, setMessages } = useFunctionContext();

  const sendMessage = async () => {
    const message = input.trim();
    if (!message) return;

    // 生成唯一ID
    const userMsgId = Date.now().toString();
    const tempMsgId = (Date.now() + 1).toString();
    
    // 添加用户消息
    setMessages(prev => [
      ...prev, 
      { 
        content: message, 
        isUser: true, 
        id: userMsgId
      }
    ]);
    
    setInput('');
    
    // 添加AI思考中消息
    setMessages(prev => [
      ...prev, 
      { 
        content: '正在思考...', 
        isUser: false, 
        temp: true,
        id: tempMsgId
      }
    ]);

    try {
      const aiReply = await getResponse(message, currentFunctionType);
      
      // 替换临时消息
      setMessages(prev => [
        ...prev.filter(m => m.id !== tempMsgId),  // 移除临时消息
        { 
          content: aiReply, 
          isUser: false, 
          id: (Date.now() + 2).toString() // 新ID
        }
      ]);
      
    } catch (error) {
      console.error('发送消息失败:', error);
      
      // 更新错误消息
      setMessages(prev => prev.map(msg => 
        msg.id === tempMsgId 
          ? { ...msg, content: '抱歉，发生错误，请稍后再试。', temp: false } 
          : msg
      ));
    }
  };

  return (
    <div className="input-bar">
      <input
        type="text"
        className="chat-input"
        placeholder="请输入内容..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
      />
      <button className="send-btn">上传文件</button>
      <button className="send-btn" onClick={sendMessage}>发送</button>
    </div>
  );
};

export default InputBar;