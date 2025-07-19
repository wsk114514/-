import React, { useState, useRef, useCallback, useMemo } from 'react';
import { useFunctionContext } from '../context/FunctionContext';
import { getResponseStream } from '../services/api';

const InputBar = () => {
  const [input, setInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);
  
  const { currentFunctionType, addMessage, setMessages, isLoading: contextLoading } = useFunctionContext();
  
  // 是否显示上传按钮
  const showUploadButton = useMemo(() => 
    currentFunctionType === 'doc_qa', 
    [currentFunctionType]
  );

  // 接受的文件类型
  const acceptedFileTypes = useMemo(() => [
    '.pdf', '.doc', '.docx', '.txt'
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
      
      await getResponseStream(message, currentFunctionType, (chunk) => {
        aiResponse += chunk;
        
        // 实时更新AI消息
        setMessages(prev => prev.map(msg => 
          msg.id === aiMsgId 
            ? { ...msg, content: aiResponse } 
            : msg
        ));
      });
      
    } catch (error) {
      console.error('发送消息失败:', error);
      
      setMessages(prev => prev.map(msg => 
        msg.id === aiMsgId 
          ? { ...msg, content: '抱歉，发生错误，请稍后再试。' } 
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, contextLoading, addMessage, currentFunctionType]);

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
            {uploading ? '上传中...' : '📁 上传'}
          </button>
        </>
      )}
      
      <button 
        className="send-btn" 
        onClick={sendMessage}
        disabled={!input.trim() || isLoading || contextLoading}
        title="发送消息"
      >
        {isLoading || contextLoading ? '发送中...' : '📤 发送'}
      </button>
    </div>
  );
};

export default InputBar;