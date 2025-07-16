import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import ChatBubble from '../components/ChatBubble';
import InputBar from '../components/InputBar';
import { useFunctionContext } from '../context/FunctionContext';
import { useLocation } from 'react-router-dom';
import '../assets/styles/main.css';

const Chat = () => {
  const { messages, currentFunctionType, setMessages } = useFunctionContext();
  const location = useLocation();
  const [initialized, setInitialized] = useState(false);
  
  // 功能标题映射
  const functionTitles = {
    play: '今天玩点什么好？',
    game_guide: '攻略询问',
    doc_qa: '文档检索问答',
    game_wiki: '游戏百科',
    general: '通用助手'
  };

  // 欢迎消息映射
  const welcomeMessages = {
    play: '欢迎使用游戏推荐功能！请告诉我您的游戏偏好，我会为您推荐合适的游戏。',
    game_guide: '欢迎使用攻略助手！请告诉我您需要哪个游戏的攻略。',
    doc_qa: '欢迎使用文档检索功能！请提出您的问题，我会在文档中查找答案。',
    game_wiki: '欢迎使用游戏百科！请告诉我您想了解的游戏或相关知识点。',
    general: '您好！我是睿玩智库！有什么可以帮到您？'
  };

  // 根据当前功能类型设置欢迎消息
  useEffect(() => {
    // 只在初始加载或路径变化时设置欢迎消息
    if (!initialized || location.pathname !== '/') {
      const welcomeMessage = welcomeMessages[currentFunctionType] || welcomeMessages.general;
      
      // 确保不会重复添加欢迎消息
      const hasWelcomeMessage = messages.some(msg => 
        msg.content === welcomeMessage && !msg.isUser
      );
      
      if (!hasWelcomeMessage) {
        setMessages([{ 
          content: welcomeMessage, 
          isUser: false, 
          id: `welcome-${Date.now()}` 
        }]);
      }
      
      setInitialized(true);
    }
  }, [currentFunctionType, location.pathname]);

  return (
    <div className="container">
      <Sidebar />
      <main className="main-content">
        <div className="function-header">
          <h2>{functionTitles[currentFunctionType]}</h2>
        </div>
        <div className="chat-area">
          {messages.map((msg) => (
            <ChatBubble 
              key={msg.id} 
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