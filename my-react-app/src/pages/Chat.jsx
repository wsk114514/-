import React from 'react';
import Sidebar from '../components/Sidebar';
import ChatBubble from '../components/ChatBubble';
import InputBar from '../components/InputBar';
import '../assets/styles/main.css';

const Chat = () => {
  return (
    <div className="container"> {/* 修改类名从chat-container为container */}
      <Sidebar />
      <main className="main-content"> {/* 添加main-content类名 */}
        <div className="chat-area">
          <ChatBubble isUser={false} content="您好！我是睿玩智库！有什么可以帮到您？" />
        </div>
        <InputBar />
      </main>
    </div>
  );
};

export default Chat;