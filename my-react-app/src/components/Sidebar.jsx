import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { useFunctionContext } from '../context/FunctionContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { clearFunctionMemory } from '../services/api';
import { getCurrentUserId, getSessionInfo, clearUserSession } from '../utils/userSession';

const Sidebar = () => {
    const navigate = useNavigate();
    const { setCurrentFunctionType, clearMessages, VALID_FUNCTION_TYPES, currentFunctionType } = useFunctionContext();
    const { user, logout } = useAuth();
    const [sessionInfo, setSessionInfo] = useState(null);

    // 获取会话信息
    useEffect(() => {
        const info = getSessionInfo();
        setSessionInfo(info);
    }, []);

    // 手动清除当前功能记忆
    const handleClearCurrentMemory = useCallback(async () => {
        try {
            clearMessages(); // 清除前端消息
            await clearFunctionMemory(currentFunctionType); // 清除后端对应功能的记忆
            alert('当前功能的对话记忆已清除');
        } catch (error) {
            console.error('清除记忆失败:', error);
            alert('清除记忆失败，请重试');
        }
    }, [clearMessages, currentFunctionType]);

    // 清除用户会话
    const handleClearUserSession = useCallback(() => {
        if (confirm('确定要清除当前用户会话吗？这将清除所有对话记忆。')) {
            clearUserSession();
            clearMessages();
            const newInfo = getSessionInfo();
            setSessionInfo(newInfo);
            alert('用户会话已重置');
        }
    }, [clearMessages]);

    // 菜单项配置
    const menuItems = useMemo(() => [
        {
            key: 'general',
            href: '/general',
            label: '通用助手',
            icon: '💬'
        },
        {
            key: 'play',
            href: '/play',
            label: '今天玩点什么好？',
            icon: '🎮'
        },
        {
            key: 'game_guide',
            href: '/game_guide',
            label: '攻略询问',
            icon: '📖'
        },
        {
            key: 'doc_qa',
            href: '/doc_qa',
            label: '文档检索问答',
            icon: '📄'
        },
        {
            key: 'game_wiki',
            href: '/game_wiki',
            label: '游戏百科',
            icon: '📚'
        }
    ], []);

    // 处理菜单项点击
    const handleMenuItemClick = useCallback(async (functionType, e) => {
        e.preventDefault();
        
        // 验证功能类型
        if (!VALID_FUNCTION_TYPES.includes(functionType)) {
            console.error(`❌ Invalid function type: ${functionType}`);
            return;
        }

        try {
            console.log(`🔄 切换到功能: ${functionType}`);
            
            // 设置新的功能类型并导航
            setCurrentFunctionType(functionType);
            navigate(`/${functionType}`);
            
            console.log(`✅ 成功切换到功能: ${functionType}`);
        } catch (error) {
            console.error('❌ 切换功能失败:', error);
        }
    }, [VALID_FUNCTION_TYPES, setCurrentFunctionType, navigate]);

    // 处理退出登录
    const handleLogout = useCallback(() => {
        try {
            logout();
            navigate('/');
        } catch (error) {
            console.error('退出登录失败:', error);
        }
    }, [logout, navigate]);

    return (
        <aside className="sidebar">
            {/* Logo */}
            <div className="logo">
                <img src="/logo.png" alt="睿玩智库logo" className="logo-image" />
                睿玩智库
            </div>
            
            {/* 用户信息 */}
            {user && (
                <div className="user-info">
                    欢迎, {user.username}
                </div>
            )}
            
            {/* 主菜单 */}
            <nav className="menu">
                {menuItems.map(item => (
                    <a 
                        key={item.key}
                        href={item.href} 
                        className={`menu-item ${item.key === 'general' ? 'menu-item-general' : ''}`}
                        onClick={(e) => handleMenuItemClick(item.key, e)}
                    >
                        <span className="menu-icon">{item.icon}</span>
                        {item.label.split('\n').map((line, index) => (
                            <span key={index}>
                                {line}
                                {index < item.label.split('\n').length - 1 && <br />}
                            </span>
                        ))}
                    </a>
                ))}
            </nav>
            
            {/* 用户会话信息 */}
            {sessionInfo && (
                <div className="session-info">
                    <div className="session-title">当前会话</div>
                    <div className="user-id">
                        用户ID: {sessionInfo.userId.substring(0, 8)}...
                    </div>
                    <button 
                        className="clear-session-btn"
                        onClick={handleClearUserSession}
                        title="重置用户会话"
                    >
                        重置会话
                    </button>
                </div>
            )}
            
            {/* 底部功能按钮 */}
            {user && (
                <div className="sidebar-footer">
                    <button 
                        className="clear-memory-btn" 
                        onClick={handleClearCurrentMemory}
                        title="清除当前功能的对话记忆"
                    >
                        清除当前记忆
                    </button>
                    <button 
                        className="logout-btn" 
                        onClick={handleLogout}
                    >
                        退出登录
                    </button>
                </div>
            )}
        </aside>
    );
};

export default Sidebar;