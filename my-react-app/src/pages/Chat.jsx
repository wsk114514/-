import React from 'react';
import Sidebar from '../components/Sidebar';
import ChatBubble from '../components/ChatBubble';
import InputBar from '../components/InputBar';
import { useFunctionContext } from '../context/FunctionContext';
import '../assets/styles/main.css';

const Chat = () => {
  const { messages } = useFunctionContext();

  return (
    <div className="container">
      <Sidebar />
      <main className="main-content">
        <div className="chat-area">
          {/* 动态渲染消息列表 */}
          {messages.map((msg) => (
            <ChatBubble 
              key={msg.id} // 确保使用唯一ID
              isUser={msg.isUser} 
              content={msg.content}
              id={msg.id}
            />
          ))}
        </div>
        <InputBar />
      </main>
    </div>
  );
};

export default Chat;