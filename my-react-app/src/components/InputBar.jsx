import { useState } from 'react';
import { useFunctionContext } from '../context/FunctionContext';
import { getResponse } from '../services/api';

const InputBar = () => {
  const [input, setInput] = useState('');
  const { currentFunctionType, messages, setMessages } = useFunctionContext();

  const sendMessage = async () => {
    const message = input.trim();
    if (!message) return;

    // 添加用户消息
    const newMessages = [...messages, { content: message, isUser: true }];
    setMessages(newMessages);
    setInput('');

    // 添加AI思考中消息
    setMessages([...newMessages, { content: '正在思考...', isUser: false, temp: true }]);

    try {
      const aiReply = await getResponse(message, currentFunctionType);
      // 替换临时消息
      setMessages(newMessages.filter(m => !m.temp).concat({
        content: aiReply, isUser: false
      }));
    } catch (error) {
      console.error('发送消息失败:', error);
      setMessages(newMessages.filter(m => !m.temp).concat({
        content: '抱歉，我遇到了一些问题，请稍后再试。', isUser: false
      }));
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