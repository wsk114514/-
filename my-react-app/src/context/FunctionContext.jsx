import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { getResponseStream } from '../services/api';

const FunctionContext = createContext();

export const useFunctionContext = () => {
  const context = useContext(FunctionContext);
  if (!context) {
    throw new Error('useFunctionContext 必须在 FunctionProvider 内部使用');
  }
  return context;
};

export const FunctionProvider = ({ children }) => {
  const [currentFunctionType, setCurrentFunctionType] = useState('general');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // 有效的功能类型
  const VALID_FUNCTION_TYPES = ['play', 'game_guide', 'doc_qa', 'game_wiki', 'general'];

  // 从URL路径获取功能类型
  useEffect(() => {
    const pathSegments = window.location.pathname.split('/');
    const functionTypeFromURL = pathSegments[pathSegments.length - 1];
    
    if (VALID_FUNCTION_TYPES.includes(functionTypeFromURL)) {
      setCurrentFunctionType(functionTypeFromURL);
    }
  }, []);

  // 切换功能类型
  const switchFunction = useCallback((functionType) => {
    if (VALID_FUNCTION_TYPES.includes(functionType)) {
      setCurrentFunctionType(functionType);
    } else {
      console.warn(`Invalid function type: ${functionType}`);
    }
  }, []);

  // 添加消息
  const addMessage = useCallback((message) => {
    setMessages(prev => [...prev, message]);
  }, []);

  // 清空消息
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // 重新生成消息
  const regenerateMessage = useCallback(async (messageId) => {
    try {
      setIsLoading(true);
      
      // 找到要重新生成的消息
      const messageToRegenerate = messages.find(msg => msg.id === messageId);
      if (!messageToRegenerate || messageToRegenerate.isUser) {
        return;
      }
      
      // 找到该消息对应的用户消息
      const messageIndex = messages.findIndex(msg => msg.id === messageId);
      if (messageIndex <= 0) return;
      
      const userMessage = messages[messageIndex - 1];
      
      // 添加"正在思考..."的临时消息
      const tempId = `temp-${Date.now()}`;
      setMessages(prev => [
        ...prev.slice(0, messageIndex),
        { 
          content: '正在重新思考...', 
          isUser: false, 
          temp: true,
          id: tempId
        },
        ...prev.slice(messageIndex + 1)
      ]);
      
      // 使用流式响应重新获取回复
      let newResponse = '';
      await getResponseStream(userMessage.content, currentFunctionType, (chunk) => {
        newResponse += chunk;
        // 实时更新消息
        setMessages(prev => prev.map(msg => 
          msg.id === tempId 
            ? { ...msg, content: newResponse, temp: false } 
            : msg
        ));
      });
      
    } catch (error) {
      console.error('重新生成消息失败:', error);
      setMessages(prev => prev.map(msg => 
        msg.id.startsWith('temp-') 
          ? { ...msg, content: '抱歉，重新生成消息失败。', temp: false } 
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  }, [messages, currentFunctionType]);

  // 上下文值
  const contextValue = {
    // 状态
    currentFunctionType,
    messages,
    isLoading,
    
    // 操作方法
    setCurrentFunctionType,
    setMessages,
    switchFunction,
    addMessage,
    clearMessages,
    regenerateMessage,
    
    // 常量
    VALID_FUNCTION_TYPES
  };

  return (
    <FunctionContext.Provider value={contextValue}>
      {children}
    </FunctionContext.Provider>
  );
};