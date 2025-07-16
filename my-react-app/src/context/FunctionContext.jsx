import React, { createContext, useState, useContext ,useEffect} from 'react';
import { getResponse } from '../services/api'; // 添加导入
const FunctionContext = createContext();

export const useFunctionContext = () => useContext(FunctionContext);

export const FunctionProvider = ({ children }) => {
  const [currentFunctionType, setCurrentFunctionType] = useState('general');
  const [messages, setMessages] = useState([]);
  useEffect(() => {
    const pathSegments = location.pathname.split('/');
    const functionTypeFromURL = pathSegments[pathSegments.length - 1];
    
    // 验证功能类型是否有效
    const validTypes = ['play', 'game_guide', 'doc_qa', 'game_wiki','general'];
    if (validTypes.includes(functionTypeFromURL)) {
      setCurrentFunctionType(functionTypeFromURL);
    }
  }, []);




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