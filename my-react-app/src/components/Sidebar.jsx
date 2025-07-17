// Sidebar.jsx

import { useFunctionContext } from '../context/FunctionContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { clearMemory } from '../services/api'; // 假设添加了一个清除记忆的接口

const Sidebar = () => {
    const navigate = useNavigate();
    const { setCurrentFunctionType, setMessages } = useFunctionContext();
    const { user, logout } = useAuth();
    // 处理菜单项点击
    const handleMenuItemClick = async (functionType, e) => {
        e.preventDefault();
        // 调用清除记忆的接口
        try {
            await clearMemory();
        } catch (error) {
            console.error('清除记忆失败:', error);
        }
        setCurrentFunctionType(functionType);
        navigate(`/${functionType}`);
    };
    //处理退出登录
    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <aside className="sidebar">
            <div className="logo">睿玩智库</div>
            {user && <div className="user-info">欢迎, {user.username}</div>}
            <nav className="menu">
                <a href="/play" className="menu-item" onClick={(e) => handleMenuItemClick('play', e)}>
                    今天<br />玩点什么好？
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
            {user && (
                <button className="logout-btn" onClick={handleLogout}>
                    退出登录
                </button>
            )}
        </aside>
    );
};

export default Sidebar;