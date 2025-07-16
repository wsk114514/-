import React, { createContext, useState, useContext } from 'react';
import { getResponse } from '../services/api'; // 添加导入

const FunctionContext = createContext();

export const useFunctionContext = () => useContext(FunctionContext);

export const FunctionProvider = ({ children }) => {
  const [currentFunctionType, setCurrentFunctionType] = useState('play');
  const [messages, setMessages] = useState([
    { 
      content: '您好！我是睿玩智库！有什么可以帮到您？', 
      isUser: false,
      id: Date.now().toString() // 确保ID为字符串
    }
  ]);

  // 重新生成消息的函数
  const regenerateMessage = async (messageId) => {
    // 找到要重新生成的消息
    const messageToRegenerate = messages.find(msg => msg.id === messageId);
    if (!messageToRegenerate || messageToRegenerate.isUser) return;
    
    // 找到该消息对应的用户消息
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    if (messageIndex <= 0) return;
    
    const userMessage = messages[messageIndex - 1];
    
    // 添加"正在思考..."的临时消息
    const tempId = Date.now().toString();
    setMessages(prev => [
      ...prev.slice(0, messageIndex),
      { 
        content: '正在思考...', 
        isUser: false, 
        temp: true,
        id: tempId
      },
      ...prev.slice(messageIndex + 1)
    ]);
    
    try {
      // 重新获取响应
      const aiReply = await getResponse(userMessage.content, currentFunctionType);
      
      // 替换临时消息
      setMessages(prev => [
        ...prev.slice(0, messageIndex),
        { 
          content: aiReply, 
          isUser: false,
          id: Date.now().toString() // 新ID
        },
        ...prev.slice(messageIndex + 1)
      ]);
      
    } catch (error) {
      console.error('重新生成消息失败:', error);
      setMessages(prev => prev.map(msg => 
        msg.id === tempId 
          ? { ...msg, content: '抱歉，重新生成消息失败。', temp: false } 
          : msg
      ));
    }
  };

  return (
    <FunctionContext.Provider value={{
      currentFunctionType,
      setCurrentFunctionType,
      messages,
      setMessages,
      regenerateMessage
    }}>
      {children}
    </FunctionContext.Provider>
  );
};