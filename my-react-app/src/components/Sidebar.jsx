import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { useFunctionContext } from '../context/FunctionContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { clearFunctionMemory } from '../services/api';
import { getCurrentUserId, getSessionInfo, clearUserSession } from '../utils/userSession';
import { saveChatHistory } from '../utils/chatHistory';
import ChatHistory from './ChatHistory';

const Sidebar = () => {
    const navigate = useNavigate();
    const { 
        setCurrentFunctionType, 
        clearMessages, 
        VALID_FUNCTION_TYPES, 
        currentFunctionType,
        getCurrentChat
    } = useFunctionContext();
    const { user, logout } = useAuth();
    const [sessionInfo, setSessionInfo] = useState(null);
    const [showChatHistory, setShowChatHistory] = useState(false);

    // 获取会话信息
    useEffect(() => {
        const info = getSessionInfo();
        setSessionInfo(info);
    }, []);

    // 开启新对话（保存当前聊天并清除记忆）
    const handleStartNewChat = useCallback(async () => {
        try {
            // 先保存当前聊天记录（如果有内容）
            const currentChat = getCurrentChat();
            if (currentChat.messages.length > 0) {
                saveChatHistory(currentChat.messages, currentChat.functionType);
                console.log('当前聊天已自动保存到历史记录');
            }
            
            // 清除前端消息
            clearMessages();
            
            // 清除后端对应功能的记忆
            await clearFunctionMemory(currentFunctionType);
            
            alert('已开启新对话，之前的聊天已保存到历史记录');
        } catch (error) {
            console.error('开启新对话失败:', error);
            alert('开启新对话失败，请重试');
        }
    }, [clearMessages, currentFunctionType, getCurrentChat]);

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

    // 保存当前聊天为历史记录
    const handleSaveCurrentChat = useCallback(() => {
        const currentChat = getCurrentChat();
        if (currentChat.messages.length > 0) {
            saveChatHistory(currentChat.messages, currentChat.functionType);
            alert('当前聊天已保存到历史记录');
        } else {
            alert('当前没有聊天内容可保存');
        }
    }, [getCurrentChat]);

    // 打开历史聊天
    const handleOpenChatHistory = useCallback(() => {
        setShowChatHistory(true);
    }, []);

    // 关闭历史聊天
    const handleCloseChatHistory = useCallback(() => {
        setShowChatHistory(false);
    }, []);

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
        <>
        <aside className="sidebar">
            {/* Logo */}
            <div className="logo">
                <img src="/logo.png" alt="睿玩智库logo" className="logo-image" />
                睿玩智库
            </div>
            
            {/* 用户信息 */}
            {user && (
                <div className="user-info">
                    欢迎😊, {user.username}
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
            
            {/* 聊天历史按钮 */}
            {user && (
                <div className="chat-history-section">
                    <button 
                        className="history-btn"
                        onClick={handleOpenChatHistory}
                        title="查看聊天历史"
                    >
                        📚 聊天历史
                    </button>
                    <button 
                        className="save-chat-btn"
                        onClick={handleSaveCurrentChat}
                        title="保存当前聊天"
                    >
                        💾 保存聊天
                    </button>
                </div>
            )}

            {/* 底部功能按钮 */}
            {user && (
                <div className="sidebar-footer">
                    <button 
                        className="new-chat-btn" 
                        onClick={handleStartNewChat}
                        title="保存当前聊天并开启新对话"
                    >
                        💬 开启新对话
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
        
        {/* 聊天历史模态框 */}
        <ChatHistory 
            isOpen={showChatHistory}
            onClose={handleCloseChatHistory}
        />
        </>
    );
};

export default Sidebar;