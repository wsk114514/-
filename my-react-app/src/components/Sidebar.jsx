import { useFunctionContext } from '../context/FunctionContext';
import { useNavigate } from 'react-router-dom';

const Sidebar = () => {
  const navigate = useNavigate();
  const { setCurrentFunctionType, setMessages } = useFunctionContext();

  const handleMenuItemClick = (functionType, e) => {
    e.preventDefault();
    setCurrentFunctionType(functionType);
    setMessages([]); // 清空消息
    navigate(`/${functionType}`); // 处理导航
  };

  return (
    <aside className="sidebar">
      <div className="logo">睿玩智库</div>
      <nav className="menu">
        <a href="/play" className="menu-item" onClick={(e) => handleMenuItemClick('play', e)}>
          今天<br/>玩点什么好？
        </a>
        <a href="/game_guide" className="menu-item" onClick={(e) => handleMenuItemClick('game_guide', e)}>
          攻略询问
        </a>
        <a href="/doc_qa" className="menu-item" onClick={(e) => handleMenuItemClick('doc_qa', e)}>
          文档检索问答
        </a>
        <a href="/game_wiki" className="menu-item" onClick={(e) => handleMenuItemClick('game_wiki', e)}>
          游戏百科
        </a>
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