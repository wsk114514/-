import { useState ,useRef } from 'react';
import { useFunctionContext } from '../context/FunctionContext';
import { getResponse, getResponseStream } from '../services/api';

const InputBar = () => {
  const [input, setInput] = useState('');

  const [uploading,setuploading]=useState(false);
  const fileInputRef=useRef(null);
  
  const { currentFunctionType, setMessages } = useFunctionContext();
  
  const showUploadButton=currentFunctionType=="doc_qa";

  //处理文件上传
  const handleFileUpload =async (e)=>{
    const file =e.target.files[0];
    if(!file)

      return;

    // 设置上传状态
    setuploading(true);
    try {
      const formData= new FormData();
      formData.append('file', file);
      const response = await fetch('/upload', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error('文件上传失败');
      }
      setMessages(prev => [
        ...prev,
        {
          content: '文件上传成功！',
          isUser: false,
          id: `upload-${Date.now()}`
        }
      ]);
    } catch (error) {
      console.error('文件上传失败:', error);
      setMessages(prev => [
        ...prev,
        {
          content: '文件上传失败，请重试。',
          isUser: false,
          id: `upload-error-${Date.now()}`
        }
      ]);
    }
    finally {
      setuploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // 清空文件输入
      }
    }
  };
  // 触发文件上传
  const triggerFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // 发送消息的函数
  const sendMessage = async () => {
    const message = input.trim();
    if (!message) return;

    // 生成唯一ID
    const userMsgId = Date.now().toString();
    const aiMsgId = (Date.now() + 1).toString();
    
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
        id: aiMsgId
      }
    ]);

    try {
      // 使用流式响应
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
      
      // 更新错误消息
      setMessages(prev => prev.map(msg => 
        msg.id === aiMsgId 
          ? { ...msg, content: '抱歉，发生错误，请稍后再试。' } 
          : msg
      ));
    }
  };

  return (
    <div className="input-bar-inner">
      <input
        type="text"
        className="chat-input"
        placeholder="请输入内容..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
      />
      {showUploadButton && (
        <>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileUpload}
            accept=".pdf,.doc,.docx,.txt"
            disabled={uploading}
          />
          <button 
            className="send-btn upload-btn"
            onClick={triggerFileUpload}
            disabled={uploading}
          >
            {uploading ? '上传中...' : '上传文件'}
          </button>
        </>
      )}
      <button className="send-btn" onClick={sendMessage}>
        发送
      </button>
    </div>
  );
};

export default InputBar;