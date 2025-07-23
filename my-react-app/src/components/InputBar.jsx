/**
 * InputBar.jsx - 消息输入栏组件
 * 
 * 负责用户消息输入、文件上传、发送控制等核心交互功能
 */

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { useFunctionContext } from '../context/FunctionContext';
import { getResponseStream } from '../services/api';
import { getCurrentUserId } from '../utils/userSession';

const InputBar = () => {
  const [input, setInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);
  const abortControllerRef = useRef(null);
  
  const { 
    currentFunctionType, 
    addMessage, 
    setMessages,
    messages,
    isLoading: contextLoading,
    abortResponse
  } = useFunctionContext();
  
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
        id: `upload-${Date.now()}`
      });
      
    } catch (error) {
      console.error('文件上传失败:', error);
      
      addMessage({
        content: `文件上传失败：${error.message}`,
        isUser: false,
        id: `upload-error-${Date.now()}`
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

    const userMsgId = `user-${Date.now()}`;
    const aiMsgId = `ai-${Date.now()}`;
    
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
      
      console.log(`发送消息时的messages长度: ${messages.length}`);
      console.log(`发送的chat_history:`, chat_history);
      console.log(`即将发送的完整请求数据:`, {
        message: message,
        function: currentFunctionType,
        user_id: getCurrentUserId(),
        chat_history: chat_history
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
      }, abortControllerRef.current, getCurrentUserId(), chat_history);
      
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