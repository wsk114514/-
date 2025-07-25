/**
 * InputBar.jsx - 消息输入栏组件
 * 
 * 负责用户消息输入、文件上传、发送控制等核心交互功能
 */

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useFunctionContext } from '../context/FunctionContext';
import { getResponseStream } from '../services/api';
import { getCurrentUserId } from '../utils/userSession';
import { useSearchParams } from 'react-router-dom';
import { getGameCollectionManager } from '../utils/gameCollection';
import { useAuth } from '../context/AuthContext';

// ========================= 工具函数 =========================

/**
 * 生成唯一消息ID
 */
let messageIdCounter = 0;
const generateUniqueId = (prefix = 'msg') => {
  const timestamp = Date.now();
  const counter = ++messageIdCounter;
  return `${prefix}-${timestamp}-${counter}`;
};

const InputBar = () => {
  const [input, setInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [presetQuestionProcessed, setPresetQuestionProcessed] = useState(false);
  const fileInputRef = useRef(null);
  const abortControllerRef = useRef(null);
  
  // URL参数获取：用于接收预设问题
  const [searchParams, setSearchParams] = useSearchParams();
  
  // 获取用户认证信息
  const { user } = useAuth();
  
  // 获取用户ID（用于游戏收藏）
  const getUserIdForGameCollection = useCallback(() => {
    // 首先尝试从AuthContext获取用户名
    if (user?.username) {
      return user.username;
    }
    
    // 如果AuthContext中没有用户信息，尝试从localStorage获取
    try {
      const storedUser = localStorage.getItem('user_data');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        if (userData?.username) {
          console.warn('⚠️ 从localStorage获取用户ID:', userData.username);
          return userData.username;
        }
      }
    } catch (error) {
      console.error('获取localStorage用户数据失败:', error);
    }
    
    // 最后的fallback
    console.warn('⚠️ 无法获取用户ID，使用null');
    return null;
  }, [user?.username]);
  
  const { 
    currentFunctionType, 
    addMessage, 
    setMessages,
    messages,
    isLoading: contextLoading,
    abortResponse
  } = useFunctionContext();

  // ========================= 预设问题处理 =========================

  /**
   * 处理URL参数中的预设问题
   */
  useEffect(() => {
    const presetQuestion = searchParams.get('question');
    if (presetQuestion && !presetQuestionProcessed) {
      const decodedQuestion = decodeURIComponent(presetQuestion);
      
      console.log('处理预设问题:', decodedQuestion); // 调试日志
      
      // 标记已处理，防止重复处理
      setPresetQuestionProcessed(true);
      
      // 清除URL参数，避免重复设置
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('question');
      setSearchParams(newSearchParams, { replace: true });
      
      // 只设置输入框内容，不自动发送
      setInput(decodedQuestion);
      
      // 给用户一个提示，让他们手动发送
      console.log('预设问题已填入输入框，请手动发送');
    }
  }, [searchParams, setSearchParams, presetQuestionProcessed]);

  /**
   * 发送预设问题消息
   */
  const sendPresetMessage = useCallback(async (message) => {
    if (!message || isLoading || contextLoading) return;

    console.log('发送预设消息:', message); // 调试日志

    const userMsgId = generateUniqueId('user');
    const aiMsgId = generateUniqueId('ai');
    
    // 添加用户消息
    addMessage({
      content: message,
      isUser: true,
      id: userMsgId
    });
    
    setInput(''); // 清空输入框
    setIsLoading(true);
    
    // 添加AI思考中消息
    addMessage({
      content: '正在思考...',
      isUser: false,
      id: aiMsgId
    });

    try {
      let aiResponse = '';
      
      // 准备聊天历史
      const chat_history = messages.map(msg => ({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.content
      }));
      
      // 获取用户游戏收藏数据
      const userId = getCurrentUserId(); // 用于API请求的会话ID
      const gameCollectionUserId = getUserIdForGameCollection(); // 用于游戏收藏的用户ID
      const gameCollectionManager = getGameCollectionManager(gameCollectionUserId);
      const game_collection = gameCollectionManager.getCollection();
      
      console.log('预设消息发送时的聊天历史:', chat_history);
      console.log('预设消息发送时的游戏收藏:', game_collection.length);
      
      // 创建新的 AbortController
      abortControllerRef.current = new AbortController();
      
      await getResponseStream(message, currentFunctionType, (chunk) => {
        aiResponse += chunk;
        
        // 实时更新AI消息
        setMessages(prev => prev.map(msg => 
          msg.id === aiMsgId 
            ? { ...msg, content: aiResponse } 
            : msg
        ));
      }, abortControllerRef.current, userId, chat_history, game_collection);
      
    } catch (error) {
      console.error('发送预设消息失败:', error);
      
      if (abortControllerRef.current && abortControllerRef.current.signal.aborted) {
        setMessages(prev => prev.map(msg => 
          msg.id === aiMsgId 
            ? { ...msg, content: '已停止生成。' } 
            : msg
        ));
      } else {
        setMessages(prev => prev.map(msg => 
          msg.id === aiMsgId 
            ? { ...msg, content: '抱歉，发生错误，请稍后再试。' } 
            : msg
        ));
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [isLoading, contextLoading, addMessage, currentFunctionType, setMessages, messages]);
  
  // 是否显示上传按钮
  const showUploadButton = useMemo(() => 
    currentFunctionType === 'doc_qa', 
    [currentFunctionType]
  );

  // 接受的文件类型
  const acceptedFileTypes = useMemo(() => [
    '.pdf', '.docx', '.txt'
  ], []);

  // 处理文件上传
  const handleFileUpload = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`文件上传失败: ${response.status}`);
      }
      
      const result = await response.json();
      
      addMessage({
        content: `文件 "${file.name}" 上传成功！`,
        isUser: false,
        id: generateUniqueId('upload')
      });
      
    } catch (error) {
      console.error('文件上传失败:', error);
      
      addMessage({
        content: `文件上传失败：${error.message}`,
        isUser: false,
        id: generateUniqueId('upload-error')
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [addMessage]);

  // 触发文件上传
  const triggerFileUpload = useCallback(() => {
    if (fileInputRef.current && !uploading) {
      fileInputRef.current.click();
    }
  }, [uploading]);

  // 发送消息的函数
  const sendMessage = useCallback(async () => {
    const message = input.trim();
    if (!message || isLoading || contextLoading) return;

    console.log('发送普通消息:', message); // 调试日志

    const userMsgId = generateUniqueId('user');
    const aiMsgId = generateUniqueId('ai');
    
    // 添加用户消息
    addMessage({
      content: message,
      isUser: true,
      id: userMsgId
    });
    
    setInput('');
    setIsLoading(true);
    
    // 添加AI思考中消息
    addMessage({
      content: '正在思考...',
      isUser: false,
      id: aiMsgId
    });

    try {
      let aiResponse = '';
      
      // 准备聊天历史 - 转换为后端期望的格式
      const chat_history = messages.map(msg => ({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.content
      }));
      
      // 获取用户游戏收藏数据
      const userId = getCurrentUserId(); // 用于API请求的会话ID
      const gameCollectionUserId = getUserIdForGameCollection(); // 用于游戏收藏的用户ID  
      const gameCollectionManager = getGameCollectionManager(gameCollectionUserId);
      const game_collection = gameCollectionManager.getCollection();
      
      console.log(`普通消息发送时的messages长度: ${messages.length}`);
      console.log(`发送的chat_history:`, chat_history);
      console.log(`用户会话ID: ${userId}, 游戏收藏用户ID: ${gameCollectionUserId}`);
      console.log(`用户认证状态:`, user);
      console.log(`用户名: ${user?.username}, 是否已认证: ${user ? 'true' : 'false'}`);
      console.log(`localStorage游戏收藏键:`, gameCollectionUserId ? `game_collection_${gameCollectionUserId}` : 'game_collection_guest');
      console.log(`localStorage中的游戏收藏数据:`, localStorage.getItem(gameCollectionUserId ? `game_collection_${gameCollectionUserId}` : 'game_collection_guest'));
      console.log(`发送的game_collection长度: ${game_collection.length}`);
      console.log(`game_collection详细数据:`, game_collection);
      console.log(`即将发送的完整请求数据:`, {
        message: message,
        function: currentFunctionType,
        user_id: userId,
        chat_history: chat_history,
        game_collection: game_collection
      });
      
      // 创建新的 AbortController
      abortControllerRef.current = new AbortController();
      
      await getResponseStream(message, currentFunctionType, (chunk) => {
        aiResponse += chunk;
        
        // 实时更新AI消息
        setMessages(prev => prev.map(msg => 
          msg.id === aiMsgId 
            ? { ...msg, content: aiResponse } 
            : msg
        ));
      }, abortControllerRef.current, userId, chat_history, game_collection);
      
    } catch (error) {
      console.error('发送消息失败:', error);
      
      // 检查是否是用户主动中止
      if (abortControllerRef.current && abortControllerRef.current.signal.aborted) {
        setMessages(prev => prev.map(msg => 
          msg.id === aiMsgId 
            ? { ...msg, content: '已停止生成。' } 
            : msg
        ));
      } else {
        setMessages(prev => prev.map(msg => 
          msg.id === aiMsgId 
            ? { ...msg, content: '抱歉，发生错误，请稍后再试。' } 
            : msg
        ));
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [input, isLoading, contextLoading, addMessage, currentFunctionType, setMessages]);

  // 终止当前响应
  const handleAbort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  }, []);

  // 处理键盘事件
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  // 处理输入变化
  const handleInputChange = useCallback((e) => {
    setInput(e.target.value);
  }, []);

  return (
    <div className="input-bar-inner">
      <input
        type="text"
        className="chat-input"
        placeholder="请输入内容..."
        value={input}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        disabled={isLoading || contextLoading}
      />
      
      {showUploadButton && (
        <>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileUpload}
            accept={acceptedFileTypes.join(',')}
            disabled={uploading || isLoading}
          />
          <button 
            className="send-btn upload-btn"
            onClick={triggerFileUpload}
            disabled={uploading || isLoading}
            title="上传文档文件"
          >
            {uploading ? '上传中...' : ' 上传文件'}
          </button>
        </>
      )}
      
      {/* 根据状态显示发送或终止按钮 */}
      {isLoading || contextLoading ? (
        <button 
          className="send-btn abort-btn" 
          onClick={handleAbort}
          title="停止生成"
        >
          🛑 停止
        </button>
      ) : (
        <button 
          className="send-btn" 
          onClick={sendMessage}
          disabled={!input.trim()}
          title="发送消息"
        >
          发送
        </button>
      )}
    </div>
  );
};

export default InputBar;