/**
 * FunctionContext.jsx - 功能状态管理Context
 * 
 * 这是应用的核心状态管理组件，负责：
 * 1. 🎯 多功能模式管理 - 支持5种不同的对话模式
 * 2. 💬 消息历史管理 - 每个功能独立的消息存储
 * 3. 🔄 流式响应控制 - 实时消息流的管理和中止
 * 4. 📱 URL同步 - 功能类型与路由的同步
 * 5. 🔧 错误处理 - 统一的错误处理和恢复机制
 * 
 * 支持的功能模式:
 * - general: 通用助手 (默认)
 * - play: 游戏推荐
 * - game_guide: 游戏攻略  
 * - doc_qa: 文档问答
 * - game_wiki: 游戏百科
 */

import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { getResponseStream } from '../services/api';
import { onUserSwitch } from '../utils/userSwitchEvents';
import { getGameCollectionManager } from '../utils/gameCollection';
import { generateGameCollectionContext } from '../utils/helpers';

// 创建功能状态Context
const FunctionContext = createContext();

/**
 * useFunctionContext Hook
 * 
 * 用于在组件中访问功能状态和操作方法
 * 必须在FunctionProvider内部使用
 * 
 * @returns {Object} 功能状态和操作方法
 * @throws {Error} 如果在Provider外部使用
 */
export const useFunctionContext = () => {
  const context = useContext(FunctionContext);
  if (!context) {
    throw new Error('useFunctionContext 必须在 FunctionProvider 内部使用');
  }
  return context;
};

/**
 * FunctionProvider - 功能状态提供者组件
 * 
 * 为整个应用提供功能状态管理，包括：
 * - 当前激活的功能类型
 * - 各功能独立的消息历史
 * - 加载状态和错误处理
 * - 流式响应控制
 */
export const FunctionProvider = ({ children }) => {
  // === 核心状态管理 ===
  
  // 当前激活的功能类型，默认为通用助手
  const [currentFunctionType, setCurrentFunctionType] = useState('general');
  
  // 全局加载状态，用于控制UI反馈
  const [isLoading, setIsLoading] = useState(false);
  
  // 流式响应控制器引用，用于中止正在进行的请求
  const abortControllerRef = useRef(null);
  
  // 标记当前聊天是否从历史记录加载（防止重复保存）
  const [isCurrentChatFromHistory, setIsCurrentChatFromHistory] = useState(false);
  
  // === 消息历史管理 ===
  
  // 每个功能类型独立的消息历史存储
  // 保证不同功能间的消息不会互相干扰
  const [messagesByFunction, setMessagesByFunction] = useState({
    general: [],      // 通用助手消息
    play: [],         // 游戏推荐消息
    game_guide: [],   // 游戏攻略消息
    doc_qa: [],       // 文档问答消息
    game_wiki: []     // 游戏百科消息
  });

  // === 配置常量 ===
  
  // 系统支持的所有功能类型
  // 系统支持的所有功能类型配置
  const VALID_FUNCTION_TYPES = ['play', 'game_guide', 'doc_qa', 'game_wiki', 'general'];

  // ========================= 用户切换监听 =========================
  
  /**
   * 监听用户切换事件，自动清理聊天状态
   * 防止用户切换时显示上一个用户的聊天内容
   */
  useEffect(() => {
    const handleUserSwitch = (eventData) => {
      console.log('🔄 检测到用户切换事件:', eventData);
      
      // 清空所有功能的消息记录
      setMessagesByFunction({
        general: [],
        play: [],
        game_guide: [],
        doc_qa: [],
        game_wiki: []
      });
      
      // 重置相关状态
      setIsCurrentChatFromHistory(false);
      setIsLoading(false);
      
      // 中止任何进行中的请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      
      console.log('✅ 已清理所有聊天状态，准备切换用户');
    };

    // 监听用户切换事件
    onUserSwitch(handleUserSwitch);
    
    // 返回清理函数
    return () => {
      // 注意：这里不移除监听器，因为 userSwitchEvents 没有提供移除功能
      // 在实际生产环境中应该实现监听器的移除
    };
  }, []);

  // ========================= URL同步机制 =========================
  
  /**
   * 监听路由变化，自动同步功能类型
   * 支持通过URL直接访问特定功能页面
   * 保证URL和应用状态的一致性
   */
  useEffect(() => {
    // 定义路由变化处理函数
    const handleRouteChange = () => {
      const pathSegments = window.location.pathname.split('/');
      const functionTypeFromURL = pathSegments[pathSegments.length - 1];
      
      console.log('路由变化检测:', window.location.pathname, '提取的功能类型:', functionTypeFromURL);
      
      // 只有有效的功能类型才进行切换，防止无效状态
      if (VALID_FUNCTION_TYPES.includes(functionTypeFromURL)) {
        console.log('切换功能类型到:', functionTypeFromURL);
        setCurrentFunctionType(functionTypeFromURL);
      }
    };

    // 初始化时检查一次
    handleRouteChange();

    // 监听浏览器历史记录变化（返回/前进按钮）
    window.addEventListener('popstate', handleRouteChange);
    
    // 监听React Router的路由变化
    const handlePathChange = () => {
      // 使用setTimeout确保路径已经更新
      setTimeout(handleRouteChange, 0);
    };

    // 创建一个MutationObserver来监听URL变化
    const observer = new MutationObserver(handlePathChange);
    
    // 也可以通过监听导航事件
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;
    
    window.history.pushState = function(...args) {
      originalPushState.apply(window.history, args);
      handlePathChange();
    };
    
    window.history.replaceState = function(...args) {
      originalReplaceState.apply(window.history, args);
      handlePathChange();
    };

    // 清理函数
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      observer.disconnect();
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, []); // 空依赖数组，只在组件挂载时运行一次

  // ========================= 派生状态 =========================
  
  /**
   * 获取当前功能的消息列表
   * 自动返回当前激活功能的消息历史
   */
  const messages = messagesByFunction[currentFunctionType] || [];

  // ========================= 核心操作方法 =========================
  
  /**
   * 切换功能类型
   * 
   * 功能说明：
   * - 保持各功能的消息历史独立
   * - 不清除任何数据，支持无缝切换
   * - 自动验证功能类型的有效性
   * - 实现多模式对话的核心逻辑
   * 
   * @param {string} functionType - 目标功能类型 (play/game_guide/doc_qa/game_wiki/general)
   */
  const switchFunction = useCallback((functionType) => {
    if (VALID_FUNCTION_TYPES.includes(functionType)) {
      setCurrentFunctionType(functionType);
    } else {
      console.warn(`Invalid function type: ${functionType}`);
    }
  }, []);

  /**
   * 添加消息到当前功能
   * 
   * 功能说明：
   * - 将新消息添加到当前激活功能的消息历史中
   * - 保持消息的时序性和完整性
   * - 重置历史记录标记，表示聊天已变成新对话
   * 
   * @param {Object} message - 消息对象，包含content、isUser、timestamp等字段
   */
  const addMessage = useCallback((message) => {
    setMessagesByFunction(prev => ({
      ...prev,
      [currentFunctionType]: [...(prev[currentFunctionType] || []), message]
    }));
    // 添加新消息时重置历史记录标记，表示聊天已变成新对话
    setIsCurrentChatFromHistory(false);
  }, [currentFunctionType]);

  /**
   * 清空当前功能的消息
   * 
   * 功能说明：
   * - 清除当前激活功能的所有消息历史
   * - 用于用户主动清理对话或开始新对话
   * - 重置相关状态标记
   */
  const clearMessages = useCallback(() => {
    console.log(`正在清除功能 ${currentFunctionType} 的消息...`);
    setMessagesByFunction(prev => {
      const newState = {
        ...prev,
        [currentFunctionType]: []
      };
      console.log(`清除后的消息状态:`, newState);
      return newState;
    });
    // 清空消息时重置历史记录标记，表示开始新对话
    setIsCurrentChatFromHistory(false);
    console.log(`功能 ${currentFunctionType} 的消息已清除`);
  }, [currentFunctionType]);

  /**
   * 重置历史记录标记
   * 
   * 功能说明：
   * - 标记当前对话为新对话
   * - 用于区分从历史记录加载的对话和用户新创建的对话
   * - 防止重复保存历史记录
   */
  const markChatAsNew = useCallback(() => {
    setIsCurrentChatFromHistory(false);
  }, []);

  /**
   * 设置当前功能的消息
   * 
   * 功能说明：
   * - 支持直接设置消息数组或通过函数更新
   * - 主要用于从历史记录加载对话
   * - 提供灵活的消息状态更新机制
   * 
   * @param {Array|Function} messagesOrUpdater - 消息数组或更新函数
   */
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
      
      // 准备聊天历史 - 取到重新生成消息之前的历史
      const historyBeforeRegeneration = currentMessages.slice(0, messageIndex - 1);
      const chat_history = historyBeforeRegeneration.map(msg => ({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.content
      }));
      
      // 获取用户游戏收藏数据
      const userId = 'default'; // 这里可以根据实际需要获取用户ID
      const gameCollectionManager = getGameCollectionManager(userId);
      const game_collection = gameCollectionManager.getCollection();
      
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
      }, abortControllerRef.current, userId, chat_history, game_collection);
      
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