import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
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
  const [isLoading, setIsLoading] = useState(false);
  
  // 用于控制流式响应的中止
  const abortControllerRef = useRef(null);
  
  // 跟踪当前聊天是否是从历史记录加载的（用于防止重复保存）
  const [isCurrentChatFromHistory, setIsCurrentChatFromHistory] = useState(false);
  
  // 每个功能独立的消息历史
  const [messagesByFunction, setMessagesByFunction] = useState({
    general: [],
    play: [],
    game_guide: [],
    doc_qa: [],
    game_wiki: []
  });

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

  // 获取当前功能的消息
  const messages = messagesByFunction[currentFunctionType] || [];

  // 切换功能类型（不清除记忆）
  const switchFunction = useCallback((functionType) => {
    if (VALID_FUNCTION_TYPES.includes(functionType)) {
      setCurrentFunctionType(functionType);
    } else {
      console.warn(`Invalid function type: ${functionType}`);
    }
  }, []);

  // 添加消息到当前功能
  const addMessage = useCallback((message) => {
    setMessagesByFunction(prev => ({
      ...prev,
      [currentFunctionType]: [...(prev[currentFunctionType] || []), message]
    }));
    // 添加新消息时重置历史记录标记，表示聊天已变成新对话
    setIsCurrentChatFromHistory(false);
  }, [currentFunctionType]);

  // 清空当前功能的消息
  const clearMessages = useCallback(() => {
    setMessagesByFunction(prev => ({
      ...prev,
      [currentFunctionType]: []
    }));
    // 清空消息时重置历史记录标记，表示开始新对话
    setIsCurrentChatFromHistory(false);
  }, [currentFunctionType]);

  // 重置历史记录标记（当用户开始新对话或发送新消息时）
  const markChatAsNew = useCallback(() => {
    setIsCurrentChatFromHistory(false);
  }, []);

  // 设置当前功能的消息
  const setMessages = useCallback((messagesOrUpdater) => {
    setMessagesByFunction(prev => {
      const currentMessages = prev[currentFunctionType] || [];
      const newMessages = typeof messagesOrUpdater === 'function' 
        ? messagesOrUpdater(currentMessages)
        : messagesOrUpdater;
      
      return {
        ...prev,
        [currentFunctionType]: newMessages
      };
    });
  }, [currentFunctionType]);

  // 加载历史聊天
  const loadHistoryChat = useCallback((history) => {
    // 切换到对应的功能类型
    if (history.functionType !== currentFunctionType) {
      setCurrentFunctionType(history.functionType);
    }
    
    // 加载历史消息
    setMessagesByFunction(prev => ({
      ...prev,
      [history.functionType]: history.messages
    }));
    
    // 标记当前聊天是从历史记录加载的，防止重复保存
    setIsCurrentChatFromHistory(true);
  }, [currentFunctionType]);

  // 获取当前聊天用于保存
  const getCurrentChat = useCallback(() => {
    const currentMessages = messagesByFunction[currentFunctionType] || [];
    return {
      messages: currentMessages,
      functionType: currentFunctionType
    };
  }, [currentFunctionType, messagesByFunction]);

  // 检查是否有真正的用户对话（现在不再有欢迎语，所以只需检查是否有用户消息）
  const hasRealUserConversation = useCallback(() => {
    const currentMessages = messagesByFunction[currentFunctionType] || [];
    // 检查是否有用户发送的消息
    return currentMessages.some(msg => msg.isUser === true);
  }, [currentFunctionType, messagesByFunction]);

  // 重新生成消息
  const regenerateMessage = useCallback(async (messageId) => {
    try {
      setIsLoading(true);
      
      // 获取当前消息并查找要重新生成的消息
      const currentMessages = messagesByFunction[currentFunctionType] || [];
      const messageToRegenerate = currentMessages.find(msg => msg.id === messageId);
      
      if (!messageToRegenerate || messageToRegenerate.isUser) {
        return;
      }
      
      const messageIndex = currentMessages.findIndex(msg => msg.id === messageId);
      if (messageIndex <= 0) return;
      
      const userMessage = currentMessages[messageIndex - 1];
      const tempId = `temp-${Date.now()}`;
      
      // 更新消息为"正在重新思考..."
      setMessagesByFunction(prev => ({
        ...prev,
        [currentFunctionType]: prev[currentFunctionType].map((msg, index) => 
          index === messageIndex 
            ? { ...msg, content: '正在重新思考...', temp: true, id: tempId }
            : msg
        )
      }));
      
      // 使用流式响应重新获取回复 - 添加重新生成标识和随机性
      const regeneratePrompts = [
        `请用不同的方式重新回答：${userMessage.content}`,
        `换个角度回答这个问题：${userMessage.content}`,
        `请提供另一种回答方式：${userMessage.content}`,
        `重新思考并回答：${userMessage.content}`,
        `用不同的表达方式回答：${userMessage.content}`
      ];
      const randomPrompt = regeneratePrompts[Math.floor(Math.random() * regeneratePrompts.length)];
      
      // 创建新的 AbortController
      abortControllerRef.current = new AbortController();
      
      let newResponse = '';
      await getResponseStream(randomPrompt, currentFunctionType, (chunk) => {
        newResponse += chunk;
        // 实时更新消息
        setMessagesByFunction(prev => ({
          ...prev,
          [currentFunctionType]: prev[currentFunctionType].map(msg => 
            msg.id === tempId 
              ? { ...msg, content: newResponse, temp: false } 
              : msg
          )
        }));
      }, abortControllerRef.current);
      
    } catch (error) {
      console.error('重新生成消息失败:', error);
      // 检查是否是用户主动中止
      if (abortControllerRef.current && abortControllerRef.current.signal.aborted) {
        setMessagesByFunction(prev => ({
          ...prev,
          [currentFunctionType]: prev[currentFunctionType].map(msg => 
            msg.id && msg.id.startsWith('temp-') 
              ? { ...msg, content: '已停止生成。', temp: false } 
              : msg
          )
        }));
      } else {
        setMessagesByFunction(prev => ({
          ...prev,
          [currentFunctionType]: prev[currentFunctionType].map(msg => 
            msg.id && msg.id.startsWith('temp-') 
              ? { ...msg, content: '抱歉，重新生成消息失败。', temp: false } 
              : msg
          )
        }));
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentFunctionType, messagesByFunction]);

  // 终止当前的流式响应
  const abortResponse = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  }, []);

  // 上下文值
  const contextValue = {
    // 状态
    currentFunctionType,
    messages,
    isLoading,
    messagesByFunction,
    isCurrentChatFromHistory,
    
    // 操作方法
    setCurrentFunctionType,
    setMessages,
    switchFunction,
    addMessage,
    clearMessages,
    regenerateMessage,
    abortResponse,
    loadHistoryChat,
    getCurrentChat,
    markChatAsNew,
    hasRealUserConversation,
    
    // 常量
    VALID_FUNCTION_TYPES
  };

  return (
    <FunctionContext.Provider value={contextValue}>
      {children}
    </FunctionContext.Provider>
  );
};