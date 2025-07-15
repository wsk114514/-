import { useFunctionContext } from '../context/FunctionContext';
import { getResponse } from '../services/api';

const Sidebar = () => {
  const { setCurrentFunctionType, setMessages } = useFunctionContext();

  const handleMenuItemClick = async (buttonText, functionType) => {
    setCurrentFunctionType(functionType);
    setMessages([]);

    try {
      const aiReply = await getResponse('你好！', functionType);
      setMessages([
        { content: buttonText, isUser: false },
        { content: aiReply, isUser: false }
      ]);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <aside className="sidebar">
      <div className="logo">睿玩智库</div>
      <nav className="menu">
        <a href="#" className="menu-item" onClick={(e) => {
          e.preventDefault();
          handleMenuItemClick('今天玩点什么好？', 'play');
        }}>今天<br/>玩点什么好？</a>
        <a href="#" className="menu-item" onClick={(e) => {
          e.preventDefault();
          handleMenuItemClick('攻略询问', 'game_guide');
        }}>攻略询问</a>
        <a href="#" className="menu-item" onClick={(e) => {
          e.preventDefault();
          handleMenuItemClick('文档检索问答', 'doc_qa');
        }}>文档检索问答</a>
        <a href="#" className="menu-item" onClick={(e) => {
          e.preventDefault();
          handleMenuItemClick('游戏百科', 'game_wiki');
        }}>游戏百科</a>
      </nav>
      <div className="recent-chats">
        <button className="recent-chat-btn">最近聊天1</button>
        <button className="recent-chat-btn">最近聊天2</button>
        <button className="recent-chat-btn">最近聊天3</button>
      </div>
    </aside>
  );
};

export default Sidebar;