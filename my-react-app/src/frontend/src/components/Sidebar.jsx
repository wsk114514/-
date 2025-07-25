/**
 * Sidebar.jsx - 侧边栏导航组件
 * 
 * 负责功能模式切换、用户信息显示、设置管理等导航功能
 */

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
        getCurrentChat,
        loadHistoryChat,
        hasRealUserConversation
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
            // 只有当有真正的用户对话时才保存
            if (hasRealUserConversation()) {
                const currentChat = getCurrentChat();
                const userId = user?.username || null;
                saveChatHistory(currentChat.messages, currentChat.functionType, undefined, userId);
                console.log('当前聊天已自动保存到历史记录');
            } else {
                console.log('没有真正的用户对话，跳过保存');
            }
            
            // 清除前端消息
            clearMessages();
            
            // 等待一小段时间确保状态更新完成
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // 清除后端对应功能的记忆
            await clearFunctionMemory(currentFunctionType);
            
            alert('已开启新对话，之前的聊天已保存到历史记录');
        } catch (error) {
            console.error('开启新对话失败:', error);
            alert('开启新对话失败，请重试');
        }
    }, [clearMessages, currentFunctionType, getCurrentChat, hasRealUserConversation]);

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

    // 打开历史聊天
    const handleOpenChatHistory = useCallback(() => {
        setShowChatHistory(true);
    }, []);

    // 关闭历史聊天
    const handleCloseChatHistory = useCallback(() => {
        setShowChatHistory(false);
    }, []);

    // 处理加载历史聊天（解决无限叠加问题的关键）
    const handleLoadHistoryChat = useCallback((history) => {
        // 加载历史记录时不自动保存当前聊天，避免无限叠加
        // 因为历史记录本身就是已保存的内容，不需要重复保存
        
        // 直接加载选中的历史聊天
        loadHistoryChat(history);
        
        // 导航到对应的功能页面
        navigate(`/${history.functionType}`);
        
        // 关闭历史记录模态框
        setShowChatHistory(false);
        
        console.log('已加载历史聊天记录:', history.title);
    }, [loadHistoryChat, navigate]);

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

    // 处理菜单项点击（移除自动保存机制）
    const handleMenuItemClick = useCallback(async (functionType, e) => {
        e.preventDefault();
        
        // 验证功能类型
        if (!VALID_FUNCTION_TYPES.includes(functionType)) {
            console.error(`❌ Invalid function type: ${functionType}`);
            return;
        }

        try {
            console.log(`🔄 切换到功능: ${functionType}`);
            
            // 移除自动保存机制，只保留简单的功能切换逻辑
            // 聊天历史只有在点击"开启新对话"时才会保存
            console.log('切换功能时不再自动保存聊天历史');
            
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

    // 返回欢迎页面
    const handleBackToWelcome = useCallback(() => {
        navigate('/welcome');
    }, [navigate]);

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
                </div>
            )}

            {/* 底部功能按钮 */}
            {user && (
                <div className="sidebar-footer">
                    <button 
                        className="welcome-btn" 
                        onClick={handleBackToWelcome}
                        title="返回欢迎页面"
                    >
                        🏠 返回首页
                    </button>
                    <button 
                        className="new-chat-btn" 
                        onClick={handleStartNewChat}
                        title="保存当前聊天并开启新对话"
                    >
                        💬 开启新对话
                    </button>
                    <button 
                        className="collection-btn" 
                        onClick={() => navigate('/collection')}
                        title="查看游戏收藏列表"
                    >
                        📚 游戏收藏
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
            onLoadChat={handleLoadHistoryChat}
        />
        </>
    );
};

export default Sidebar;